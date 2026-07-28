# -*- coding: utf-8 -*-
"""
검수 완료 후 한 번에 실행: 크롭 재생성 -> 검출기/분류기 재학습 -> 실전 평가.

annotator.py 로 검수한 결과(annotations.json)를 반영해 처음부터 다시 돌린다.
각 단계는 --from 으로 건너뛸 수 있다 (예: 학습부터 다시 하려면 --from train).

사용법:
  python pipeline/run_after_review.py
  python pipeline/run_after_review.py --from train      # 크롭 생성은 건너뛰고 학습부터
  python pipeline/run_after_review.py --from eval       # 평가만
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DET_WEIGHTS = ROOT / 'runs/detect/pipeline/runs/sign_det/weights/best.pt'
PROTO = '데이터수집전/데이터프로토타입_석진'
ANSWERS = '데이터수집전/데이터프로토타입_석진_답지_v2.csv'

STEPS = ['crop', 'det', 'cls', 'eval']


def run(desc, cmd):
    print(f'\n{"="*66}\n▶ {desc}\n{"="*66}', flush=True)
    t0 = time.time()
    r = subprocess.run([sys.executable] + cmd, cwd=ROOT)
    if r.returncode != 0:
        print(f'✗ 실패: {desc} (exit {r.returncode})')
        sys.exit(r.returncode)
    print(f'✓ 완료 ({time.time()-t0:.0f}초)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='start', choices=STEPS, default='crop')
    ap.add_argument('--only-reviewed', action='store_true',
                    help='수동 검수된 이미지만 학습에 사용')
    args = ap.parse_args()
    begin = STEPS.index(args.start)

    if begin <= 0:
        cmd = ['pipeline/03_make_crops.py']
        if args.only_reviewed:
            cmd.append('--only-reviewed')
        run('1/4 크롭 재생성 (검수 결과 반영, test split 제외)', cmd)

    if begin <= 1:
        run('2/4 표지판 검출기 학습 (YOLO, 약 40분)',
            ['pipeline/04_train.py', '--step', 'det'])

    if begin <= 2:
        run('3/4 크롭 분류기 학습 (ResNet50, 약 5분)',
            ['pipeline/04_train.py', '--step', 'cls'])

    if begin <= 3:
        if not DET_WEIGHTS.exists():
            print(f'✗ 검출기 가중치를 찾을 수 없습니다: {DET_WEIGHTS}')
            sys.exit(1)
        run('4/4 실전 평가 (석진 폴더 + 답지 채점)',
            ['pipeline/05_two_stage_eval.py',
             '--det', str(DET_WEIGHTS),
             '--cls', 'pipeline/crop_classifier.pt',
             '--data', PROTO,
             '--answers', ANSWERS,
             '--out', '데이터수집전/report_two_stage.html'])

    print('\n전부 완료했습니다.')
    print('  리포트: 데이터수집전/report_two_stage.html')
    print('  비교 기준 — 1단계(크롭 없음) 68.2% / 검수 전 2단계 54.5%')


if __name__ == '__main__':
    main()
