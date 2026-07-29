# 대구역 표지판 인식

사진에서 대구역 안내 표지판을 찾아 41개 중 어느 것인지 분류합니다.
실내에서 GPS가 안 잡히는 문제를 표지판 인식으로 대신 해결하기 위한 모델입니다.

실전 사진 56장 기준 정확도 92.9% (52/56).

## 구조

모델 두 개를 순서대로 사용합니다.

```
사진 → EXIF 회전 보정 → YOLO로 표지판 검출 → 크롭 → ResNet18로 분류 → 확신도 판정
```

표지판은 사진에서 작게 잡히기 때문에, 전체 사진을 축소하면 글자가 뭉개져 비슷한 표지판을 구분하지 못합니다.
그래서 표지판 영역만 먼저 잘라낸 뒤 분류합니다.

- 검출: YOLOv8n, 1클래스(`sign`), conf 0.25
- 분류: ResNet18, 입력 128x448 (표지판 가로세로비 중앙값이 4.8이라 가로형 입력을 씁니다)
- 박스가 여러 개 검출되면 `면적 x 중앙근접도` 점수가 가장 높은 것을 사용
- 크롭 시 상하좌우 12% 여유
- 확신도 0.40 미만은 `미분류` 처리

## 테스트

학습 없이 모델과 사진만 있으면 됩니다.

**1. 다운로드**

- 모델 2개 (49MB): [weights](https://drive.google.com/drive/folders/10bZmrgDxFnklpmjvPO6m0KfXT2Em8Yv6?usp=drive_link)
- 테스트 사진 `test_combined` (138MB): [data](https://drive.google.com/drive/folders/12NkPnLQtZ5DR99Y-i7LzoV1_IkNwsIjJ?usp=drive_link)

정답지는 `data/answers/`에 포함되어 있습니다.

**2. 설치**

```bash
git clone https://lab.ssafy.com/s15-webmobile1-sub1/S15P11D104.git
cd S15P11D104/ai
pip install -r requirements.txt
```

GPU가 있으면 torch를 CUDA 버전으로 먼저 설치합니다. 없어도 동작합니다 (사진당 0.3~0.4초).

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
```

**3. 모델 배치**

```
ai/models/
├── detector_yolov8n.pt      6MB
└── classifier_resnet18.pt   43MB
```

**4. 실행**

```bash
python src/05_two_stage_eval.py \
    --det models/detector_yolov8n.pt \
    --cls models/classifier_resnet18.pt \
    --data <test_combined 경로> \
    --answers data/answers/test_all.csv \
    --out report.html
```

Windows CMD에서는 줄 끝 `\`를 `^`로 바꿉니다.

```
70장 2단계 추론
2단계 정확도: 52/56 = 92.9%
```

`report.html`에 사진별 검출 박스, 정답, 예측, 확신도가 표시됩니다. 오답이 먼저 정렬됩니다.

`--answers`를 생략하면 채점 없이 예측 결과만 확인할 수 있습니다.

**정답지**

| 파일 | 대상 | 결과 |
|---|---|---|
| `test_all.csv` | test_combined 70장 | 52/56 = 92.9% |
| `test_seokjin.csv` | 폰 촬영 30장 | 20/22 = 90.9% |
| `test_video.csv` | 영상 프레임 40장 | 31/34 = 91.2% |

채점 대상이 사진 수보다 적은 것은 41개 클래스에 없는 표지판이 찍힌 사진을 제외하기 때문입니다.

## 재학습

학습 데이터는 용량이 커서 저장소에 없습니다.
[data 드라이브](https://drive.google.com/drive/folders/12NkPnLQtZ5DR99Y-i7LzoV1_IkNwsIjJ?usp=drive_link)에서 받아
아래 구조로 두고 데이터 루트에서 실행합니다.

```
<데이터 루트>/
├── 0721_data/          원본 사진 (EXIF 회전값 조회용)
├── 0721_data_split/    1024px 리사이즈 + train/val/test
│   └── manifest.csv    원본 경로 매핑, EXIF 복구에 필요
└── src/ data/ models/  이 저장소
```

```bash
# 박스 초벌 생성 (GPU 1분)
python src/01_bootstrap_boxes.py --data 0721_data_split --out boxes.json

# 박스 검수
python src/annotator.py

# 크롭 + YOLO 데이터셋 생성 (1분)
python src/03_make_crops.py

# 학습 (검출기 40분, 분류기 5분)
python src/04_train.py --step det
python src/04_train.py --step cls --arch resnet18 --out-cls models/classifier_resnet18.pt

# 평가
python src/05_two_stage_eval.py --det <검출기.pt> --cls models/classifier_resnet18.pt \
    --data <테스트 사진> --answers data/answers/test_all.csv --out report.html
```

마지막 세 단계는 `python src/run_after_review.py`로 한 번에 실행할 수 있습니다.

### 박스 검수 도구

자동 검출된 박스에는 형광등이나 바닥을 표지판으로 잡은 것이 섞여 있습니다.
검수 없이 학습하면 성능이 떨어지므로 반드시 거쳐야 하는 단계입니다.

```bash
python src/annotator.py     # localhost:8765
```

크롭 결과가 갤러리로 표시됩니다. 정상인 것은 두고, 잘못된 것만 클릭해 원본에서 박스를 다시 그립니다.

- `Space` 확정 후 다음
- `1` `2` `3` 다른 후보 박스 선택
- `X` 표지판 없음
- `Esc` 갤러리로 복귀
- 노란 테두리는 자동 의심 표시

`data/annotations.json`에 검수 완료된 463장이 들어 있습니다. 재검수 없이 크롭 생성 단계로 넘어가도 됩니다.

## 주의사항

**추론 시 EXIF 회전을 반드시 먼저 적용해야 합니다.** 세로로 촬영한 사진은 픽셀이 눕혀서 저장되고
회전 정보만 EXIF에 남습니다. `ImageOps.exif_transpose()`를 빼면 해당 사진이 전부 오인식됩니다.
학습 데이터도 리사이즈 과정에서 EXIF가 유실되어 44%가 회전된 상태였고, `manifest.csv`로 복구했습니다.

**좌우반전 증강을 사용하면 안 됩니다.** 화살표 방향과 숫자 순서가 클래스를 구분하는 핵심 정보라
반전 학습 시 유사 표지판을 구분하지 못합니다. `fliplr=0.0`을 유지하세요.

**val 정확도는 성능 지표로 쓸 수 없습니다.** val이 학습 데이터와 동일한 조건에서 촬영되어
47 epoch 이후 계속 100%가 나옵니다. 성능 판단은 실전 사진(`test_all.csv`) 기준으로 하세요.

**클래스별 학습 데이터가 10~44장으로 불균형합니다.** `WeightedRandomSampler`로 보정하고 있습니다.

## 배포

CPU만으로 동작합니다. 4 vCPU 기준 측정값입니다.

| | 이미지 로드 | 검출 | 분류 | 합계 |
|---|---|---|---|---|
| 원본 4032px 업로드 | 185ms | 93ms | 91ms | 371ms |
| 앱에서 1280px로 축소 후 업로드 | 10ms | 88ms | 95ms | 188ms |

- 클라이언트에서 이미지를 축소해 업로드하는 것이 가장 효과적입니다. 응답 시간이 절반으로 줄고 업로드 트래픽도 감소합니다.
- `imgsz=640`으로 낮춰도 정확도가 동일하며 검출이 50ms 빨라집니다.
- 확신도 0.40 미만은 결과를 반환하지 말고 재촬영을 안내하는 것이 좋습니다.
- 메모리는 워커당 약 1GB. 4GB 이상 인스턴스를 권장합니다.
- GPU는 초당 10건 이상 처리가 필요할 때 검토하면 됩니다. CPU 4 vCPU로 초당 4~5건 처리 가능하고,
  GPU를 써도 이미지 디코드는 CPU에서 처리되므로 전체 시간은 1.8배 정도만 단축됩니다.
- t2 계열은 CPU 크레딧을 소모합니다. t2.xlarge 기준 시간당 2000건을 초과해 지속 처리하면
  크레딧 소진으로 4배 느려집니다. T2 Unlimited를 켜거나 c6i 계열을 사용하세요.

## 폴더 구조

```
ai/
├── src/
│   ├── 01_bootstrap_boxes.py   박스 초벌 생성
│   ├── 03_make_crops.py        크롭 + YOLO 데이터셋 생성, EXIF 보정
│   ├── 04_train.py             검출기·분류기 학습
│   ├── 05_two_stage_eval.py    추론 + 채점 리포트
│   ├── annotator.py            박스 검수 도구
│   └── run_after_review.py     03~05 일괄 실행
├── data/
│   ├── annotations.json        검수 완료된 박스 463장
│   └── answers/                테스트 정답지
└── models/                     git 제외, 드라이브에서 다운로드
```

가중치, 원본 사진, 생성된 크롭과 리포트는 `.gitignore`로 제외했습니다.
git은 삭제된 파일도 히스토리에 남기므로 재학습마다 저장소가 무거워집니다.

## TODO

- 평가셋 확대. 현재 56장으로 오차범위가 ±7%p이고, 41개 클래스 중 절반은 실전 사진이 없습니다.
- val 세트 재구성. 현재 포화 상태라 모델 선택에 사용할 수 없습니다.
- 미등록 표지판 처리. 41개에 없는 표지판도 모델은 무언가를 답합니다.
- ONNX 또는 OpenVINO 변환으로 CPU 추론 2~3배 가속.
- EXIF 없는 사진 대응. 메신저 경유 사진은 EXIF가 제거됩니다.
