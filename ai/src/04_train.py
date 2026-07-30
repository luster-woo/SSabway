# -*- coding: utf-8 -*-
"""
4단계: (a) YOLO 표지판 검출기 학습, (b) 크롭 분류기(ResNet50) 학습.

기존 train_sign_classifier.ipynb 의 레시피를 크롭 입력에 맞게 옮긴 것.
증강에 글레어 시뮬레이션과 원근 왜곡을 추가.

사용법:
  python pipeline/04_train.py --step det    # YOLO 검출기
  python pipeline/04_train.py --step cls    # 크롭 분류기
  python pipeline/04_train.py --step both
"""
import argparse
import random
import time
from collections import Counter
from pathlib import Path

import torch
import torch.nn as nn
import torchvision
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms
from PIL import Image, ImageDraw, ImageFilter

SEED = 42
# 표지판 크롭은 가로세로비 중앙값이 4.8로 매우 납작하다. 정사각형으로 찌그러뜨리면
# 글자가 뭉개져 비슷한 표지판을 구분하지 못하므로, 가로로 긴 입력을 쓴다.
INPUT_HW = (128, 448)
BATCH = 32
EPOCHS = 60
LR = 3e-4
MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]


class RandomGlare:
    """실전 사진에서 확인된 표지판 면 반사광(빛 번짐) 시뮬레이션."""
    def __init__(self, p=0.35):
        self.p = p

    def __call__(self, img):
        if random.random() > self.p:
            return img
        w, h = img.size
        overlay = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(overlay)
        for _ in range(random.randint(1, 3)):
            cx, cy = random.uniform(0, w), random.uniform(0, h * 0.7)
            rw, rh = random.uniform(0.15, 0.5) * w, random.uniform(0.08, 0.3) * h
            d.ellipse([cx - rw, cy - rh, cx + rw, cy + rh],
                      fill=random.randint(120, 220))
        overlay = overlay.filter(ImageFilter.GaussianBlur(radius=w * 0.06))
        white = Image.new('RGB', (w, h), (255, 255, 255))
        return Image.composite(white, img, overlay)


def build_model(arch, n_classes):
    """분류기 아키텍처 생성. resnet18 은 IMAGENET1K_V2 가중치가 없어 V1 을 쓴다."""
    if arch.startswith('resnet'):
        w = 'IMAGENET1K_V2' if arch in ('resnet50', 'resnet101') else 'IMAGENET1K_V1'
        m = getattr(torchvision.models, arch)(weights=w)
        m.fc = nn.Linear(m.fc.in_features, n_classes)
    elif arch == 'mobilenet_v3_large':
        m = torchvision.models.mobilenet_v3_large(weights='IMAGENET1K_V2')
        m.classifier[3] = nn.Linear(m.classifier[3].in_features, n_classes)
    elif arch == 'efficientnet_b0':
        m = torchvision.models.efficientnet_b0(weights='IMAGENET1K_V1')
        m.classifier[1] = nn.Linear(m.classifier[1].in_features, n_classes)
    else:
        raise ValueError(f'지원하지 않는 arch: {arch}')
    return m


class CropDataset(Dataset):
    def __init__(self, root, classes, tf):
        self.items = []
        for cls in classes:
            for p in sorted((Path(root) / cls).glob('*')):
                self.items.append((p, classes.index(cls)))
        self.tf = tf

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        p, y = self.items[i]
        return self.tf(Image.open(p).convert('RGB')), y


def train_cls(crops_root, out_path, arch='resnet50'):
    random.seed(SEED)
    torch.manual_seed(SEED)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print('device:', device)

    classes = sorted(p.name for p in (Path(crops_root) / 'train').iterdir() if p.is_dir())
    print(f'{len(classes)}클래스')

    train_tf = transforms.Compose([
        RandomGlare(),
        # 가로로 긴 표지판이므로 크롭 비율도 가로로 길게 잡는다
        transforms.RandomResizedCrop(INPUT_HW, scale=(0.65, 1.0), ratio=(2.5, 6.0)),
        transforms.RandomPerspective(distortion_scale=0.22, p=0.5),
        transforms.ColorJitter(brightness=0.4, contrast=0.35, saturation=0.25, hue=0.03),
        transforms.RandomRotation(6),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
        transforms.RandomErasing(p=0.35, scale=(0.02, 0.15)),
    ])
    val_tf = transforms.Compose([
        transforms.Resize(INPUT_HW),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])

    train_ds = CropDataset(Path(crops_root) / 'train', classes, train_tf)
    val_ds = CropDataset(Path(crops_root) / 'val', classes, val_tf)

    # 클래스별 장수가 10~44장으로 4배 차이 난다. 그대로 두면 많은 클래스가
    # 적은 클래스를 흡수하므로, 클래스가 고르게 뽑히도록 가중 샘플링한다.
    counts = Counter(y for _, y in train_ds.items)
    weights = [1.0 / counts[y] for _, y in train_ds.items]
    sampler = WeightedRandomSampler(weights, num_samples=len(train_ds), replacement=True)
    train_dl = DataLoader(train_ds, batch_size=BATCH, sampler=sampler, num_workers=4,
                          pin_memory=True, persistent_workers=True)
    val_dl = DataLoader(val_ds, batch_size=BATCH, shuffle=False, num_workers=2,
                        pin_memory=True, persistent_workers=True)
    print(f'train {len(train_ds)} / val {len(val_ds)}')

    model = build_model(arch, len(classes))
    model.to(device)
    nparam = sum(p.numel() for p in model.parameters())
    print(f'{arch}: {nparam/1e6:.1f}M 파라미터')

    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS)
    crit = nn.CrossEntropyLoss(label_smoothing=0.1)
    scaler = torch.amp.GradScaler('cuda', enabled=device.type == 'cuda')

    best_acc = 0.0
    for ep in range(1, EPOCHS + 1):
        model.train()
        t0, tl = time.time(), 0.0
        for x, y in train_dl:
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            opt.zero_grad(set_to_none=True)
            with torch.amp.autocast('cuda', enabled=device.type == 'cuda'):
                loss = crit(model(x), y)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            tl += loss.item() * x.size(0)
        sched.step()

        model.eval()
        n_ok = 0
        with torch.no_grad():
            for x, y in val_dl:
                x, y = x.to(device), y.to(device)
                n_ok += (model(x).argmax(1) == y).sum().item()
        acc = n_ok / len(val_ds)
        flag = ''
        if acc > best_acc:
            best_acc = acc
            torch.save({'model': model.state_dict(), 'classes': classes,
                        'arch': arch, 'input_hw': list(INPUT_HW),
                        'input': 'crop', 'epoch': ep}, out_path)
            flag = ' *saved'
        print(f'ep{ep:02d} loss {tl/len(train_ds):.3f} val_acc {acc:.3%}'
              f' ({time.time()-t0:.0f}s){flag}')
    print(f'best val acc: {best_acc:.3%} -> {out_path}')


def train_det(yolo_yaml, out_dir):
    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
    model.train(data=yolo_yaml, epochs=60, imgsz=960, batch=16,
                project=out_dir, name='sign_det', seed=SEED,
                degrees=5, perspective=0.0005, scale=0.5, fliplr=0.0)
    print('검출기 저장:', Path(out_dir) / 'sign_det' / 'weights' / 'best.pt')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--step', choices=['det', 'cls', 'both'], default='both')
    ap.add_argument('--crops', default='pipeline/crops')
    ap.add_argument('--yolo-yaml', default='pipeline/yolo_ds/dataset.yaml')
    ap.add_argument('--out-cls', default='pipeline/crop_classifier.pt')
    ap.add_argument('--arch', default='resnet50',
                    choices=['resnet18', 'resnet34', 'resnet50',
                             'mobilenet_v3_large', 'efficientnet_b0'])
    ap.add_argument('--out-det', default='pipeline/runs')
    args = ap.parse_args()

    if args.step in ('det', 'both'):
        train_det(args.yolo_yaml, args.out_det)
    if args.step in ('cls', 'both'):
        train_cls(args.crops, args.out_cls, args.arch)
