# -*- coding: utf-8 -*-
"""
1단계: 제로샷 검출로 학습 이미지 전체에 표지판 바운딩박스 초벌 라벨 생성.

YOLO-World(텍스트 프롬프트 제로샷)를 사용해 0721_data_split의 모든 이미지에서
표지판 후보 박스를 뽑아 boxes.json 으로 저장한다.
결과는 02_review_viewer.py 로 만든 HTML에서 사람이 검수한다.

사용법:
  python pipeline/01_bootstrap_boxes.py --data 0721_data_split --out pipeline/boxes.json
"""
import argparse
import json
import time
from pathlib import Path

from ultralytics import YOLOWorld

# 역사 표지판을 잡기 위한 프롬프트. YOLO-World는 문구별로 클래스를 나눠 검출한다.
PROMPTS = [
    "yellow sign with text",
    "dark blue sign with text",
    "long horizontal signboard hanging from ceiling",
    "sign with korean text",
]

CONF_THRES = 0.02  # 주 표지판이 0.03 수준으로 잡히는 경우가 있어 낮게. 검수에서 거른다
IOU_MERGE = 0.6
MAX_AREA_FRAC = 0.5  # 화면 절반 넘는 박스는 천장 등 오검출로 보고 제외


def iou(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    if inter == 0:
        return 0.0
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    return inter / (area_a + area_b - inter)


def score(d):
    """주 표지판 선택용 점수: 확신도 x 면적. 작은 화살표/모니터 오검출이
    확신도만 높게 나오는 문제를 면적 가중으로 눌러준다."""
    x1, y1, x2, y2 = d['xyxy']
    return d['conf'] * max(0, x2 - x1) * max(0, y2 - y1)


def merge_boxes(dets):
    """프롬프트별 중복 검출을 IoU 기준으로 합친다(점수 큰 것 우선)."""
    dets = sorted(dets, key=lambda d: -score(d))
    kept = []
    for d in dets:
        if all(iou(d['xyxy'], k['xyxy']) < IOU_MERGE for k in kept):
            kept.append(d)
    return kept


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='0721_data_split')
    ap.add_argument('--out', default='pipeline/boxes.json')
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()

    model = YOLOWorld('yolov8l-worldv2.pt')
    model.set_classes(PROMPTS)

    paths = sorted(p for p in Path(args.data).rglob('*')
                   if p.is_file() and p.suffix.lower() in ('.jpg', '.jpeg', '.png'))
    if args.limit:
        paths = paths[:args.limit]
    print(f'{len(paths)}장 검출 시작')

    out = {}
    t0 = time.time()
    for i, p in enumerate(paths, 1):
        res = model.predict(str(p), conf=CONF_THRES, imgsz=640, verbose=False)[0]
        W, H = res.orig_shape[1], res.orig_shape[0]
        dets = []
        for b in res.boxes:
            x1, y1, x2, y2 = [round(float(v), 1) for v in b.xyxy[0].tolist()]
            if (x2 - x1) * (y2 - y1) > MAX_AREA_FRAC * W * H:
                continue
            dets.append({
                'xyxy': [x1, y1, x2, y2],
                'conf': round(float(b.conf[0]), 3),
                'prompt': PROMPTS[int(b.cls[0])],
            })
        out[str(p.relative_to(args.data)).replace('\\', '/')] = merge_boxes(dets)
        if i % 100 == 0 or i == len(paths):
            print(f'  {i}/{len(paths)} ({time.time()-t0:.0f}s)')

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    n_box = sum(len(v) for v in out.values())
    n_empty = sum(1 for v in out.values() if not v)
    print(f'저장: {args.out} — 박스 {n_box}개, 검출 0건 이미지 {n_empty}장')


if __name__ == '__main__':
    main()
