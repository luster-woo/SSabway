# -*- coding: utf-8 -*-
"""
5단계: 2단계(검출→크롭 분류) 추론 + 답지 채점 리포트.

사진 → YOLO 검출 → 박스별 크롭 → 분류기 → 박스 선택 정책으로 최종 답 결정.
박스 선택 정책: (박스 면적 × 중앙 근접도)가 가장 큰 박스의 예측을 채택.
확신도 임계값 미만이면 '미분류'로 처리한다.

사용법:
  python pipeline/05_two_stage_eval.py \
      --det pipeline/runs/sign_det/weights/best.pt \
      --cls pipeline/crop_classifier.pt \
      --data "데이터수집전/데이터프로토타입_석진" \
      --answers "데이터수집전/데이터프로토타입_석진_답지_v2.csv" \
      --out "데이터수집전/report_two_stage.html"
"""
import argparse
import base64
import csv
import io
import time
from pathlib import Path

import torch
import torch.nn as nn
import torchvision
from torchvision import transforms
from PIL import Image, ImageDraw, ImageOps

MARGIN = 0.12
CONF_UNKNOWN = 0.40  # 이 미만이면 '미분류'


def load_answers(csv_path):
    answers = {}
    with open(csv_path, encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            label = (row.get('label') or '').strip()
            if not label or label in ('-', '?'):
                label = None
            answers[row['filename'].strip()] = (label, (row.get('note') or '').strip())
    return answers


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--det', required=True)
    ap.add_argument('--cls', required=True)
    ap.add_argument('--data', required=True)
    ap.add_argument('--answers', default='')
    ap.add_argument('--out', default='report_two_stage.html')
    args = ap.parse_args()

    from ultralytics import YOLO
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    det = YOLO(args.det)

    ckpt = torch.load(args.cls, map_location='cpu')
    classes = ckpt['classes']
    # 학습 때 쓴 입력 크기와 아키텍처를 체크포인트에서 그대로 따라간다
    hw = ckpt.get('input_hw') or [ckpt.get('img_size', 224)] * 2
    arch = ckpt.get('arch', 'resnet50')
    if arch.startswith('resnet'):
        clf = getattr(torchvision.models, arch)(weights=None)
        clf.fc = nn.Linear(clf.fc.in_features, len(classes))
    elif arch == 'mobilenet_v3_large':
        clf = torchvision.models.mobilenet_v3_large(weights=None)
        clf.classifier[3] = nn.Linear(clf.classifier[3].in_features, len(classes))
    elif arch == 'efficientnet_b0':
        clf = torchvision.models.efficientnet_b0(weights=None)
        clf.classifier[1] = nn.Linear(clf.classifier[1].in_features, len(classes))
    else:
        raise ValueError(f'지원하지 않는 arch: {arch}')
    clf.load_state_dict(ckpt['model'])
    print(f'분류기: {arch}, 입력 {hw[0]}x{hw[1]}')
    clf.to(device).eval()
    tf = transforms.Compose([
        transforms.Resize((hw[0], hw[1])),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    answers = load_answers(args.answers) if args.answers else None

    def natural_key(p):
        """1.png, 2.png, 10.png 순으로 정렬 (문자열 정렬이면 10이 2보다 앞선다)."""
        return (0, int(p.stem), '') if p.stem.isdigit() else (1, 0, p.name)

    paths = sorted((p for p in Path(args.data).rglob('*')
                    if p.is_file() and p.suffix.lower() in ('.jpg', '.jpeg', '.png')),
                   key=natural_key)
    print(f'{len(paths)}장 2단계 추론')

    results = []
    t0 = time.time()
    with torch.no_grad():
        for i, p in enumerate(paths, 1):
            # EXIF 방향을 반드시 먼저 적용한다. 폰을 세로로 들고 찍으면 픽셀은
            # 눕혀서 저장되고 "돌려서 봐라"는 정보만 EXIF에 남는다. 이걸 적용하지
            # 않으면 표지판이 90도 누운 채로 모델에 들어가 전부 틀린다.
            img = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
            W, H = img.size
            r = det.predict(img, conf=0.25, verbose=False)[0]
            dets = [b.xyxy[0].tolist() for b in r.boxes]

            pred, conf, top3, box = '미검출', 0.0, [], None
            if dets:
                box = pick_box(dets, W, H)
                x1, y1, x2, y2 = box
                mw, mh = (x2 - x1) * MARGIN, (y2 - y1) * MARGIN
                crop = img.crop((max(0, x1 - mw), max(0, y1 - mh),
                                 min(W, x2 + mw), min(H, y2 + mh)))
                prob = clf(tf(crop).unsqueeze(0).to(device)).softmax(1)[0]
                v, idx = prob.topk(min(3, len(classes)))
                top3 = [(classes[j], float(pv)) for pv, j in zip(v.cpu(), idx.cpu())]
                pred, conf = top3[0]
                if conf < CONF_UNKNOWN:
                    pred = f'미분류({top3[0][0]})'

            true, note = (answers.get(p.name, (None, '답지에 없음'))
                          if answers is not None else (None, ''))
            ok = None
            if true:
                ok = (top3[0][0] == true) if top3 else False

            thumb = img.copy()
            td = ImageDraw.Draw(thumb)
            for d in dets:
                td.rectangle(d, outline=(255, 171, 0), width=max(3, W // 400))
            if box:
                td.rectangle(box, outline=(0, 230, 118), width=max(5, W // 250))
            thumb.thumbnail((420, 420))
            buf = io.BytesIO()
            thumb.save(buf, format='JPEG', quality=78)

            results.append({'name': p.name, 'true': true, 'pred': pred, 'top3': top3,
                            'ok': ok, 'note': note, 'nbox': len(dets),
                            'thumb': base64.b64encode(buf.getvalue()).decode('ascii')})
            if i % 10 == 0 or i == len(paths):
                print(f'  {i}/{len(paths)} ({time.time()-t0:.0f}s)')

    labeled = [r for r in results if r['ok'] is not None]
    n_ok = sum(1 for r in labeled if r['ok'])
    acc_txt = f'{n_ok}/{len(labeled)} = {n_ok/len(labeled):.1%}' if labeled else '채점 대상 없음'
    print(f'\n2단계 정확도: {acc_txt}')

    order = {False: 0, None: 1, True: 2}

    def sort_key(r):
        stem = Path(r['name']).stem
        return (order[r['ok']], 0, int(stem), '') if stem.isdigit() \
            else (order[r['ok']], 1, 0, r['name'])

    results.sort(key=sort_key)
    cards = []
    for r in results:
        if r['ok'] is False:
            cls_, badge = 'wrong', '❌ 오답'
        elif r['ok'] is True:
            cls_, badge = 'ok', '✅ 정답'
        else:
            cls_, badge = 'na', '➖ 채점 제외'
        bars = ''
        for rank, (lb, pv) in enumerate(r['top3']):
            hl = ' hl' if rank == 0 else ''
            bars += (f'<div class="bar{hl}"><span class="lb">{lb}</span>'
                     f'<span class="track"><span class="fill" style="width:{pv*100:.0f}%"></span></span>'
                     f'<span class="pv">{pv*100:.1f}%</span></div>')
        note_html = f'<div class="note">{r["note"]}</div>' if r.get('note') else ''
        # 파일명이 숫자면 큰 번호 배지로 보여준다 (사람이 번호로 지적하기 쉽게)
        stem = Path(r['name']).stem
        num_html = f'<span class="num">{stem}</span>' if stem.isdigit() else ''
        cards.append(
            f'<div class="card {cls_}">'
            f'{num_html}'
            f'<img src="data:image/jpeg;base64,{r["thumb"]}" loading="lazy">'
            f'<div class="body">'
            f'<div class="head"><span class="badge">{badge}</span><span class="fn">{r["name"]}</span></div>'
            f'<div class="vs"><div class="col"><div class="k">정답</div><div class="v">{r["true"] or "?"}</div></div>'
            f'<div class="col"><div class="k">AI 예측</div><div class="v">{r["pred"]}</div></div>'
            f'<div class="col"><div class="k">박스</div><div class="v">{r["nbox"]}</div></div></div>'
            f'{bars}{note_html}</div></div>')

    html = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>2단계 파이프라인 리포트</title><style>
 body{{font-family:'Malgun Gothic',sans-serif;background:#eceff1;margin:0}}
 header{{background:#1a237e;color:#fff;padding:14px 24px;position:sticky;top:0;z-index:2}}
 header h1{{margin:0;font-size:18px}}
 header .stats{{margin-top:6px;font-size:14px;color:#c5cae9}} header .stats b{{color:#ffd54f}}
 #grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;padding:16px}}
 .card{{background:#fff;border-radius:10px;overflow:hidden;border:3px solid transparent;box-shadow:0 1px 4px rgba(0,0,0,.12);position:relative}}
 .num{{position:absolute;top:8px;left:8px;z-index:1;background:rgba(13,17,23,.86);color:#fff;
       font-size:22px;font-weight:bold;line-height:1;padding:7px 13px;border-radius:8px;
       font-family:Consolas,monospace}}
 .card.ok{{border-color:#66bb6a}} .card.wrong{{border-color:#ef5350}} .card.na{{border-color:#b0bec5}}
 .card img{{width:100%;height:230px;object-fit:cover;display:block;background:#000}}
 .body{{padding:10px 12px}}
 .head{{display:flex;align-items:center;gap:8px;margin-bottom:8px}}
 .badge{{font-size:13px;font-weight:bold}}
 .fn{{font-size:11px;color:#90a4ae;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
 .vs{{display:flex;gap:8px;margin-bottom:8px}}
 .col{{flex:1;background:#f5f7f8;border-radius:6px;padding:6px 8px;text-align:center}}
 .k{{font-size:11px;color:#78909c}} .v{{font-size:14px;font-weight:bold;color:#263238}}
 .bar{{display:flex;align-items:center;gap:6px;font-size:12px;margin:3px 0;color:#546e7a}}
 .bar .lb{{width:64px;font-weight:bold}}
 .bar .track{{flex:1;height:8px;background:#eceff1;border-radius:4px;overflow:hidden}}
 .bar .fill{{display:block;height:100%;background:#90a4ae;border-radius:4px}}
 .bar.hl .fill{{background:#1e88e5}} .bar.hl{{color:#263238}}
 .bar .pv{{width:46px;text-align:right}}
 .note{{margin-top:8px;font-size:12px;color:#607d8b;background:#f5f7f8;border-radius:6px;padding:6px 8px}}
</style></head><body>
<header><h1>🎯 2단계 (검출→크롭 분류) 리포트</h1>
<div class="stats">정확도 <b>{acc_txt}</b> · 총 {len(results)}장 · 초록 박스 = 채택, 주황 = 기타 검출</div>
</header><div id="grid">{''.join(cards)}</div></body></html>"""
    Path(args.out).write_text(html, encoding='utf-8')
    print('리포트:', Path(args.out).resolve())


if __name__ == '__main__':
    main()
