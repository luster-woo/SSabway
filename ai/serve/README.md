# 표지판 인식 API 서버

`../src` 의 추론 파이프라인을 HTTP로 감싼 것입니다. Spring 백엔드가 사진을 넘기면 어느 표지판인지 돌려줍니다.

```
앱 ──사진──> Spring Boot (8080) ──사진──> FastAPI (8000)
                  길찾기·DB                 YOLO + ResNet18
```

Spring에 넣지 않고 서버를 따로 두는 이유는 PyTorch가 파이썬 라이브러리라 자바에서 쓸 수 없기 때문입니다.

## API

| | | |
|---|---|---|
| `POST` | `/predict` | 사진 1장 → 표지판 id |
| `WS` | `/ws/v1/ai/faces` | 영상 프레임 → 얼굴 좌표 (화상 상담 모자이크용) |
| `GET` | `/health` | 살아있는지 + 모델이 올라왔는지 |
| `GET` | `/classes` | 인식 가능한 41개 목록 |
| `GET` | `/docs` | 브라우저에서 바로 테스트 |

### POST /predict

`multipart/form-data`, 필드 이름 `file`. jpeg / png / webp, 15MB 이하.

```bash
curl -F "file=@sign.jpg" http://localhost:8000/predict
```

```json
{
  "sign": "S3_02",
  "confidence": 0.9431,
  "status": "ok",
  "candidates": [
    { "sign": "S3_02", "confidence": 0.9431 },
    { "sign": "S3_15", "confidence": 0.0322 },
    { "sign": "S3_07", "confidence": 0.0091 }
  ],
  "box": [412.5, 733.1, 1180.4, 901.7],
  "boxCount": 2,
  "imageSize": [1280, 960],
  "elapsedMs": 94
}
```

`status` 세 가지를 구분해서 처리해야 합니다.

| status | 뜻 | 화면에서 |
|---|---|---|
| `ok` | 확신도 0.40 이상 | 그대로 사용 |
| `low_confidence` | 표지판은 찾았는데 애매함 | `candidates` 보여주고 사용자에게 고르게 하기 |
| `no_detection` | 사진에 표지판이 없음 | 다시 찍어달라고 안내 |

`low_confidence` 일 때도 `sign` 값은 채워서 보냅니다. 감추는 것보다 "이거 맞나요?" 하고 확인받는 편이 낫기 때문입니다.

### WS /ws/v1/ai/faces

화상 상담에서 주변 사람 얼굴을 가리기 위한 좌표를 준다. **모자이크는 브라우저가**
canvas 로 처리한다 (`frontend/src/user/features/mosaic/`). 서버는 좌표만 돌려준다.

```
받고  {"frameId": 12, "timestamp": 1712..., "image": "<base64 JPEG>"}
주고  {"frameId": 12, "timestamp": 1712..., "faces": [
          {"x": 100, "y": 80, "width": 120, "height": 140, "confidence": 0.95}]}
```

좌표는 **보내온 이미지의 픽셀 기준**이다. 브라우저가 원본 해상도로 환산한다.

모델은 YuNet(227KB ONNX, OpenCV Zoo). 표지판 모델과 달리 이미지에 넣어 두므로
`/opt/models` 마운트가 필요 없다. 검출기는 **연결마다 새로 만든다** —
`cv2.FaceDetectorYN` 이 `setInputSize` 로 내부 상태를 바꿔서 공유하면 해상도가
섞인다. 생성이 8ms 라 부담이 없다.

**깨진 프레임에는 응답하지 않는다.** 빈 목록을 보내면 브라우저가 "얼굴 없음"
으로 받아 모자이크를 풀어 버리기 때문이다. 응답이 끊기면 브라우저가 2초 후
전체 블러로 후퇴한다(`STALE_MS`) — 안전한 쪽으로 실패한다.

⚠️ **여기 들어오는 프레임은 아직 가려지지 않은 원본이다.** 좌표만 뽑고 즉시
버린다. 디스크나 로그에 남기면 모자이크의 존재 이유가 사라진다.

#### 해상도를 낮추면 안 된다

역 사진 120장으로 잰 검출률이다. 표지판을 비추는 화면이라 주변 사람이 멀리
작게 찍히는데, 축소하면 얼굴이 몇 픽셀로 뭉개져 사라진다.

| 긴 변 | 검출된 사진 | 추론 | 장당(q35) |
|---|---|---|---|
| 1280 | **34/120** | 28ms | 79KB |
| 960 | 12/120 | 17ms | 45KB |
| 640 | 4/120 | 8ms | 23KB |
| 320 | **0/120** | 4ms | 12KB |

JPEG 품질은 거의 영향이 없다(q60 과 q30 의 결과가 같다). 대역폭을 줄여야 하면
해상도가 아니라 **품질과 주기**를 건드릴 것. 프론트는 1280px · q0.35 · 400ms
(약 264KB/s)로 맞춰져 있다.

## 실행

```bash
cd ai/serve
pip install -r requirements.txt
```

가중치 2개를 `models/` 에 둡니다 ([다운로드](https://drive.google.com/drive/folders/10bZmrgDxFnklpmjvPO6m0KfXT2Em8Yv6?usp=drive_link)).

```
models/detector.pt      YOLOv8n, 6MB
models/classifier.pt    ResNet18, 45MB
```

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

http://localhost:8000/docs 에서 사진을 올려 바로 확인할 수 있습니다.

### Docker

```bash
docker build -t sign-api .
docker run -d -p 8000:8000 -v /opt/models:/models --name sign-api sign-api
```

가중치는 이미지에 넣지 않고 마운트합니다. 재학습할 때마다 이미지를 다시 빌드하지 않아도 되고, 이미지도 50MB 가벼워집니다.

## 환경변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `MODEL_DIR` | `./models` | 가중치 폴더 |
| `DET_PATH` / `CLS_PATH` | `$MODEL_DIR/detector.pt`, `classifier.pt` | 개별 경로 |
| `DEVICE` | 자동 | `cpu` / `cuda` 강제 |
| `TORCH_THREADS` | `2` | 워커 하나가 쓸 CPU 스레드 |
| `MAX_SIDE` | `1280` | 들어온 사진 긴 변 상한 |
| `MAX_UPLOAD_MB` | `15` | 업로드 크기 제한 |

## 운영할 때 알아야 할 것

### 사진은 앱에서 줄여서 보내야 합니다

같은 사진 15장을 원본과 1280px 축소본으로 각각 보낸 결과입니다 (4 vCPU, CPU 추론).

| | 업로드 크기 | 서버 추론 | 왕복 |
|---|---|---|---|
| 원본 그대로 | 2.50MB | 697ms | 758ms |
| 1280px로 줄여서 | 0.24MB | **94ms** | **109ms** |

**7배 차이인데 예측 결과는 15장 모두 동일합니다.** 병목은 추론이 아니라 큰 JPEG를 디코딩하는 데 있습니다. 서버도 `MAX_SIDE` 로 한 번 더 줄이지만, 그때는 이미 디코딩 비용을 치른 뒤라 늦습니다. 앱에서 줄여 보내는 게 유일한 해결책입니다.

### 워커 수는 메모리를 보고 정해야 합니다

워커 하나가 모델을 통째로 들고 있어 **약 1GB** 를 씁니다. `--workers 4` 로 띄우면 4GB이고, 같은 EC2에 Spring까지 있으면 OOM으로 죽습니다. 메모리를 확인하고 늘려야 합니다.

### 모델은 서버가 뜰 때 한 번만 로드됩니다

`main.py` 의 `lifespan` 에서 올립니다. 요청마다 `torch.load` 하면 매번 수 초가 걸립니다. 첫 요청이 유독 느린 것을 막으려고 기동할 때 더미 이미지로 한 번 돌려 둡니다 (`_warmup`).

기동에 10~30초 걸리므로 헬스체크 `start-period` 를 넉넉히 줘야 합니다. 준비 전에는 `/health` 가 503을 돌려줍니다.

### 추론 엔드포인트는 `async def` 가 아닙니다

일부러 그렇습니다. FastAPI는 일반 `def` 를 스레드풀에서 돌리기 때문에 무거운 추론이 이벤트 루프를 막지 않습니다. `async def` 로 바꾸면 오히려 요청이 한 줄로 서서 느려집니다.

## Spring 쪽 연동

```java
// application.yml:  ai.base-url: http://localhost:8000
MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
body.add("file", file.getResource());

PredictResponse res = restClient.post()
        .uri(aiBaseUrl + "/predict")
        .contentType(MediaType.MULTIPART_FORM_DATA)
        .body(body)
        .retrieve()
        .body(PredictResponse.class);
```

AI 서버는 같은 EC2 안에서만 접근하면 되므로 **8000 포트를 외부에 열 필요가 없습니다.** 보안그룹에서 막고 Spring만 `localhost:8000` 으로 부르게 하는 편이 안전합니다.

## 정확도

실전 사진 22장 기준 21/22 = 95.5% (`data/answers/test_seokjin.csv`). 모델 자체와 임계값은 `../src/05_two_stage_eval.py` 와 동일하며, 값을 바꿀 때는 양쪽을 같이 고쳐야 결과가 어긋나지 않습니다.
