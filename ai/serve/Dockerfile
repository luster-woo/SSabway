# CPU 전용 이미지. GPU 서버가 아니라면 CUDA 빌드를 받을 이유가 없다
# (CUDA 라이브러리까지 딸려와 이미지가 2GB 이상 커진다).
FROM python:3.12-slim

# opencv(ultralytics 의존)가 libGL 과 libglib 을 찾는다. 없으면 import 에서 죽는다.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# torch 를 CPU 인덱스에서 먼저 받는다. requirements.txt 보다 앞에 두어야
# 의존성 해석 과정에서 GPU 빌드가 딸려오지 않는다.
RUN pip install --no-cache-dir \
        --index-url https://download.pytorch.org/whl/cpu \
        torch torchvision

# 코드보다 먼저 복사해야 코드만 바뀌었을 때 이 레이어를 재사용한다
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY inference.py face.py main.py ./

# 얼굴 검출 모델(227KB)은 표지판 가중치와 달리 이미지에 넣는다.
# OpenCV Zoo 에서 받은 그대로라 재학습할 일이 없고, 크기가 작아 레이어
# 캐시에도 부담이 없다. /opt/models 마운트를 인프라와 맞출 필요가 없어진다.
COPY face_detection_yunet_2023mar.onnx ./

# 가중치는 이미지에 넣지 않는다. 재학습할 때마다 이미지를 다시 빌드하게 되고,
# 이미지 크기도 50MB 늘어난다. 호스트 디렉터리를 마운트해서 쓴다:
#   docker run -v /opt/models:/models -e MODEL_DIR=/models ...
ENV MODEL_DIR=/models \
    TORCH_THREADS=2 \
    MAX_SIDE=1280 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# 워커 하나당 모델을 통째로 들고 있어 약 1GB 를 쓴다.
# 메모리를 확인하지 않고 --workers 를 늘리면 OOM 으로 죽는다.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
