# -*- coding: utf-8 -*-
"""
추론 로직. 웹 프레임워크와 무관하게 동작한다.

src/05_two_stage_eval.py 와 같은 결과를 내야 한다. 임계값이나 박스 선택
규칙을 여기서 바꾸면 평가 리포트와 서버 응답이 어긋나므로, 값을 바꿀 때는
양쪽을 같이 고쳐야 한다.
"""
import os
import time
from pathlib import Path

import torch
import torch.nn as nn
import torchvision
from PIL import Image, ImageOps
from torchvision import transforms

# 05_two_stage_eval.py 와 동일해야 하는 값들
DET_CONF = 0.25       # YOLO 검출 임계값
MARGIN = 0.12         # 크롭할 때 상하좌우 여유
CONF_UNKNOWN = 0.40   # 이 미만이면 '미분류'

# 서버에서만 쓰는 값
MAX_SIDE = int(os.getenv('MAX_SIDE', '1280'))   # 들어온 사진의 긴 변 상한


def pick_box(dets, W, H):
    """면적 x 중앙근접도 점수가 최대인 박스 채택."""
    best, best_s = None, -1
    for d in dets:
        x1, y1, x2, y2 = d
        area = (x2 - x1) * (y2 - y1) / (W * H)
        cx, cy = (x1 + x2) / 2 / W, (y1 + y2) / 2 / H
        center = 1 - min(1, ((cx - 0.5) ** 2 + (cy - 0.5) ** 2) ** 0.5)
        s = area * (0.5 + center)
        if s > best_s:
            best, best_s = d, s
    return best


def build_classifier(arch, n_classes):
    if arch.startswith('resnet'):
        m = getattr(torchvision.models, arch)(weights=None)
        m.fc = nn.Linear(m.fc.in_features, n_classes)
    elif arch == 'mobilenet_v3_large':
        m = torchvision.models.mobilenet_v3_large(weights=None)
        m.classifier[3] = nn.Linear(m.classifier[3].in_features, n_classes)
    elif arch == 'efficientnet_b0':
        m = torchvision.models.efficientnet_b0(weights=None)
        m.classifier[1] = nn.Linear(m.classifier[1].in_features, n_classes)
    else:
        raise ValueError(f'지원하지 않는 arch: {arch}')
    return m


class SignRecognizer:
    """
    모델 두 개를 들고 있는 객체.

    생성 비용이 크므로(가중치 로드 수 초) 프로세스당 한 번만 만들고
    요청마다 predict() 만 호출한다.
    """

    def __init__(self, det_path, cls_path, device=None):
        from ultralytics import YOLO

        # DEVICE 로 강제할 수 있게 해 둔다. GPU 가 보이는 개발 노트북에서
        # EC2 와 같은 조건(CPU)으로 재보고 싶을 때 필요하다.
        want = device or os.getenv('DEVICE') or (
            'cuda' if torch.cuda.is_available() else 'cpu')
        self.device = torch.device(want)

        t0 = time.time()
        self.det = YOLO(str(det_path))

        ckpt = torch.load(str(cls_path), map_location='cpu', weights_only=False)
        self.classes = ckpt['classes']
        # 학습 때 쓴 입력 크기와 아키텍처를 체크포인트에서 그대로 따라간다
        self.input_hw = ckpt.get('input_hw') or [ckpt.get('img_size', 224)] * 2
        self.arch = ckpt.get('arch') or 'resnet50'

        self.clf = build_classifier(self.arch, len(self.classes))
        self.clf.load_state_dict(ckpt['model'])
        self.clf.to(self.device).eval()

        self.tf = transforms.Compose([
            transforms.Resize((self.input_hw[0], self.input_hw[1])),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        # 첫 요청이 유독 느린 것을 막기 위해 미리 한 번 돌려 둔다
        self._warmup()
        self.load_seconds = round(time.time() - t0, 2)

    def _detect(self, img):
        # device 를 넘기지 않으면 ultralytics 가 알아서 고르는데, CUDA 가 보이지만
        # 쓸 수 없는 환경에서 잘못된 장치를 집는다. 명시적으로 지정한다.
        return self.det.predict(img, conf=DET_CONF, verbose=False,
                                device=self.device)[0]

    def _warmup(self):
        dummy = Image.new('RGB', (640, 480), (127, 127, 127))
        with torch.no_grad():
            self._detect(dummy)
            self.clf(self.tf(dummy).unsqueeze(0).to(self.device))

    def predict(self, image, topk=3):
        """
        image: PIL.Image (아직 EXIF 보정 전이어도 된다)
        반환: dict — 검출 실패나 확신도 미달도 예외가 아니라 결과로 돌려준다.
        """
        t0 = time.time()

        # EXIF 방향을 반드시 먼저 적용한다. 폰을 세로로 들고 찍으면 픽셀은
        # 눕혀서 저장되고 "돌려서 봐라"는 정보만 EXIF 에 남는다. 이걸 적용하지
        # 않으면 표지판이 90도 누운 채로 모델에 들어가 전부 틀린다.
        img = ImageOps.exif_transpose(image).convert('RGB')

        # 앱이 원본을 그대로 올려도 서버에서 한 번 더 줄인다.
        # 큰 사진은 검출 시간만 늘 뿐 정확도가 오르지 않는다.
        if MAX_SIDE and max(img.size) > MAX_SIDE:
            img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)

        W, H = img.size

        with torch.no_grad():
            r = self._detect(img)
            dets = [b.xyxy[0].tolist() for b in r.boxes]

            if not dets:
                return {
                    'sign': None, 'confidence': 0.0, 'status': 'no_detection',
                    'candidates': [], 'box': None, 'boxCount': 0,
                    'imageSize': [W, H],
                    'elapsedMs': int((time.time() - t0) * 1000),
                }

            box = pick_box(dets, W, H)
            x1, y1, x2, y2 = box
            mw, mh = (x2 - x1) * MARGIN, (y2 - y1) * MARGIN
            crop = img.crop((max(0, x1 - mw), max(0, y1 - mh),
                             min(W, x2 + mw), min(H, y2 + mh)))

            prob = self.clf(self.tf(crop).unsqueeze(0).to(self.device)).softmax(1)[0]
            v, idx = prob.topk(min(topk, len(self.classes)))
            cands = [{'sign': self.classes[j], 'confidence': round(float(pv), 4)}
                     for pv, j in zip(v.cpu(), idx.cpu())]

        top = cands[0]
        # 확신도가 낮으면 값을 숨기지 않고 status 로 알린다.
        # 호출하는 쪽이 "일단 보여주되 확인받기" 같은 판단을 할 수 있어야 한다.
        status = 'ok' if top['confidence'] >= CONF_UNKNOWN else 'low_confidence'

        return {
            'sign': top['sign'],
            'confidence': top['confidence'],
            'status': status,
            'candidates': cands,
            'box': [round(c, 1) for c in box],
            'boxCount': len(dets),
            'imageSize': [W, H],
            'elapsedMs': int((time.time() - t0) * 1000),
        }


def resolve_model_paths():
    """
    가중치 위치를 환경변수로 바꿀 수 있게 한다.
    EC2 에서는 보통 /opt/models 같은 곳에 두고 코드와 분리한다.
    """
    base = Path(os.getenv('MODEL_DIR', Path(__file__).resolve().parent / 'models'))
    det = Path(os.getenv('DET_PATH', base / 'detector.pt'))
    cls = Path(os.getenv('CLS_PATH', base / 'classifier.pt'))
    return det, cls