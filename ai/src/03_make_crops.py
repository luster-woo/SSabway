# -*- coding: utf-8 -*-
"""
3단계: 검수된 박스로 (a) 크롭 분류 데이터셋, (b) YOLO 검출 데이터셋 생성.

- boxes.json: 01단계 초벌 박스 (점수순 정렬 상태)
- annotations.json(있으면): annotator.py 수동 검수 결과. 최우선으로 반영한다.
  {rel: {"status": "ok"|"manual"|"none", "box": [x1,y1,x2,y2]}}
- review.json(있으면): 02단계 간이 검수 결과. 값이 정수면 해당 인덱스 박스 채택,
  'none' 이면 그 이미지는 제외.
- 크롭 분류셋: 채택 박스 1개를 여유(margin) 12% 주고 잘라
  pipeline/crops/{split}/{class}/파일명 으로 저장 (원본 split 유지).
- YOLO 검출셋: 모든 박스를 '표지판' 1클래스로 pipeline/yolo_ds/ 에
  ultralytics 포맷(images/, labels/, dataset.yaml)으로 저장.

사용법:
  python pipeline/03_make_crops.py --data 0721_data_split --boxes pipeline/boxes.json
"""
import argparse
import csv
import json
import shutil
from pathlib import Path

from PIL import Image

MARGIN = 0.12
MIN_SIDE = 40  # 너무 작은 박스는 버림 (px, 원본 기준)


def load_orientation(manifest_path, orig_root):
    """1024px 리사이즈 과정에서 EXIF 회전 정보가 사라졌다. manifest 의 원본 경로로
    되짚어가 orientation 을 복구한다. 학습 사진의 44%가 옆으로 누운 상태였고,
    실전 사진은 정방향이라 이 불일치가 분류 성능을 크게 떨어뜨린다."""
    ori = {}
    if not Path(manifest_path).exists():
        return ori
    for row in csv.DictReader(open(manifest_path, encoding='utf-8-sig')):
        src = Path(orig_root) / row['src_relpath']
        if src.exists():
            try:
                ori[row['split_relpath'].replace('\\', '/')] = \
                    Image.open(src).getexif().get(274, 1)
            except Exception:
                pass
    return ori


def upright(img, orientation):
    if orientation == 6:
        return img.rotate(-90, expand=True)
    if orientation == 3:
        return img.rotate(180)
    if orientation == 8:
        return img.rotate(90, expand=True)
    return img


def upright_box(box, W, H, orientation):
    """이미지를 세우면 박스 좌표도 같은 변환을 따라가야 한다."""
    x1, y1, x2, y2 = box
    if orientation == 6:      # 시계방향 90도, 새 크기 (H, W)
        return [H - y2, x1, H - y1, x2]
    if orientation == 3:      # 180도
        return [W - x2, H - y2, W - x1, H - y1]
    if orientation == 8:      # 반시계 90도
        return [y1, W - x2, y2, W - x1]
    return [x1, y1, x2, y2]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='0721_data_split')
    ap.add_argument('--boxes', default='pipeline/boxes.json')
    ap.add_argument('--review', default='pipeline/review.json')
    ap.add_argument('--ann', default='pipeline/annotations.json')
    ap.add_argument('--only-reviewed', action='store_true',
                    help='수동 검수된 이미지만 사용 (미검수분은 버림)')
    ap.add_argument('--skip-test', action='store_true', default=True,
                    help='test split 은 크롭 생성 제외 (기본값). 실전 평가는 '
                         '05_two_stage_eval.py 로 검출기가 직접 크롭해야 정직하다')
    ap.add_argument('--include-test', dest='skip_test', action='store_false')
    ap.add_argument('--crops', default='pipeline/crops')
    ap.add_argument('--yolo', default='pipeline/yolo_ds')
    ap.add_argument('--manifest', default='0721_data_split/manifest.csv')
    ap.add_argument('--orig', default='0721_data', help='EXIF 복구용 원본 폴더')
    args = ap.parse_args()

    ori = load_orientation(args.manifest, args.orig)
    n_rot = sum(1 for v in ori.values() if v in (3, 6, 8))
    print(f'EXIF 복구: {len(ori)}장 매핑, 그중 회전 보정 대상 {n_rot}장')

    boxes = json.loads(Path(args.boxes).read_text(encoding='utf-8'))
    review = {}
    if Path(args.review).exists():
        review = json.loads(Path(args.review).read_text(encoding='utf-8'))
        print(f'간이 검수 반영: {sum(1 for v in review.values() if v != 0)}건 수정/제외')

    ann = {}
    if Path(args.ann).exists():
        ann = json.loads(Path(args.ann).read_text(encoding='utf-8'))
        n_man = sum(1 for v in ann.values() if v.get('status') == 'manual')
        n_none = sum(1 for v in ann.values() if v.get('status') == 'none')
        print(f'수동 검수 반영: {len(ann)}장 (직접수정 {n_man}, 제외 {n_none})')

    crops_root = Path(args.crops)
    yolo_root = Path(args.yolo)
    if crops_root.exists():
        shutil.rmtree(crops_root)
    if yolo_root.exists():
        shutil.rmtree(yolo_root)

    n_crop = n_skip = n_test = n_fixed = 0
    for rel, dets in boxes.items():
        if args.skip_test and Path(rel).parts[0] == 'test':
            n_test += 1
            continue
        a = ann.get(rel)
        if a is not None:
            # 수동 검수 결과 우선
            if a.get('status') == 'none' or not a.get('box'):
                n_skip += 1
                continue
            main = {'xyxy': a['box']}
        else:
            if args.only_reviewed:
                n_skip += 1
                continue
            choice = review.get(rel, 0)
            if choice == 'none' or not dets:
                n_skip += 1
                continue
            choice = int(choice)
            if choice >= len(dets):
                choice = 0
            main = dets[choice]
        if ((main['xyxy'][2] - main['xyxy'][0]) < MIN_SIDE
                or (main['xyxy'][3] - main['xyxy'][1]) < MIN_SIDE):
            n_skip += 1
            continue
        src = Path(args.data) / rel
        img = Image.open(src).convert('RGB')
        W, H = img.size
        parts = Path(rel).parts          # (split, class, filename)
        split, cls, name = parts[0], parts[1], parts[-1]

        o = ori.get(rel, 1)
        if o in (3, 6, 8):
            n_fixed += 1

        # (a) 크롭 분류셋 — 채택 박스로 자른 뒤 EXIF 방향대로 세운다
        x1, y1, x2, y2 = main['xyxy']
        mw, mh = (x2 - x1) * MARGIN, (y2 - y1) * MARGIN
        cx1, cy1 = max(0, x1 - mw), max(0, y1 - mh)
        cx2, cy2 = min(W, x2 + mw), min(H, y2 + mh)
        crop = upright(img.crop((cx1, cy1, cx2, cy2)), o)
        dst = crops_root / split / cls / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        crop.save(dst, quality=92)
        n_crop += 1

        # (b) YOLO 검출셋 — 이미지와 박스를 함께 세워서 저장한다.
        #     실전 사진은 정방향이므로 검출기도 정방향으로 배워야 한다.
        #     라벨은 검수로 채택된 주 표지판 박스 1개만 사용한다
        #     (나머지 박스에는 모니터/조명 오검출이 섞여 있어 학습을 오염시킨다).
        img_dst = yolo_root / 'images' / split / f'{cls}_{name}'
        img_dst.parent.mkdir(parents=True, exist_ok=True)
        lbl_dst = yolo_root / 'labels' / split / f'{cls}_{Path(name).stem}.txt'
        lbl_dst.parent.mkdir(parents=True, exist_ok=True)
        if o in (3, 6, 8):
            up_img = upright(img, o)
            bx1, by1, bx2, by2 = upright_box(main['xyxy'], W, H, o)
            up_img.save(img_dst, quality=92)
            OW, OH = up_img.size
        else:
            shutil.copy(src, img_dst)
            bx1, by1, bx2, by2 = main['xyxy']
            OW, OH = W, H
        cx, cy = (bx1 + bx2) / 2 / OW, (by1 + by2) / 2 / OH
        bw, bh = (bx2 - bx1) / OW, (by2 - by1) / OH
        lbl_dst.write_text(f'0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}', encoding='utf-8')

    yaml = (f"path: {yolo_root.resolve().as_posix()}\n"
            "train: images/train\nval: images/val\n"
            "names:\n  0: sign\n")
    (yolo_root / 'dataset.yaml').write_text(yaml, encoding='utf-8')
    print(f'크롭 {n_crop}장 저장 (회전 보정 {n_fixed}장), 제외 {n_skip}장'
          + (f', test split {n_test}장 미생성(실전 평가용으로 보존)' if n_test else ''))
    print(f'크롭 분류셋: {crops_root}  |  YOLO 검출셋: {yolo_root}/dataset.yaml')


if __name__ == '__main__':
    main()
