# -*- coding: utf-8 -*-
"""
표지판 인식 HTTP 서버.

Spring 백엔드가 사진을 넘기면 어느 표지판인지 돌려준다.

  POST /predict   사진 1장 → 표지판 id
  GET  /health    살아있는지 + 모델이 올라왔는지
  GET  /classes   인식 가능한 표지판 목록
  GET  /docs      자동 생성된 테스트 화면

실행:
  uvicorn main:app --host 0.0.0.0 --port 8000
"""
import io
import logging
import os
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from inference import SignRecognizer, resolve_model_paths

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('sign-api')

MAX_UPLOAD_MB = int(os.getenv('MAX_UPLOAD_MB', '15'))
ALLOWED_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}

# 프로세스 하나가 물고 있는 모델. 요청마다 다시 만들지 않는다.
recognizer: SignRecognizer | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    서버가 뜰 때 딱 한 번 모델을 올린다.

    요청마다 torch.load 를 하면 매번 수 초가 걸린다. 반대로 여기서 올려 두면
    프로세스가 사는 동안 계속 재사용된다. 대신 워커 하나당 메모리를 그만큼
    차지하므로(약 1GB) 워커 수를 함부로 늘리면 안 된다.
    """
    global recognizer

    # 워커를 여러 개 띄울 때 각 워커가 CPU 를 전부 가져가려 하면 서로 방해한다.
    threads = int(os.getenv('TORCH_THREADS', '2'))
    torch.set_num_threads(threads)

    det, cls = resolve_model_paths()
    for p in (det, cls):
        if not p.exists():
            raise RuntimeError(
                f'가중치를 찾을 수 없습니다: {p}\n'
                f'MODEL_DIR 환경변수를 확인하거나 models/ 에 파일을 두세요.')

    log.info('모델 로딩 시작 (torch threads=%d)', threads)
    recognizer = SignRecognizer(det, cls)
    log.info('모델 로딩 완료 %.2fs | device=%s | %s %dx%d | 클래스 %d개',
             recognizer.load_seconds, recognizer.device, recognizer.arch,
             recognizer.input_hw[0], recognizer.input_hw[1], len(recognizer.classes))

    yield

    log.info('종료')


app = FastAPI(
    title='대구역 표지판 인식 API',
    description='사진에서 표지판을 찾아 41개 중 어느 것인지 분류합니다.',
    version='1.0.0',
    lifespan=lifespan,
)


@app.get('/health')
def health():
    """로드밸런서와 배포 스크립트가 찌르는 곳. 모델이 없으면 503."""
    if recognizer is None:
        return JSONResponse(status_code=503, content={'status': 'loading'})
    return {
        'status': 'ok',
        'device': str(recognizer.device),
        'arch': recognizer.arch,
        'inputSize': recognizer.input_hw,
        'classCount': len(recognizer.classes),
    }


@app.get('/classes')
def classes():
    if recognizer is None:
        raise HTTPException(503, '모델 로딩 중입니다.')
    return {'classes': recognizer.classes}


# async def 가 아니라 def 로 둔다.
# FastAPI 는 일반 함수를 스레드풀에서 돌리므로, 무거운 추론이 이벤트 루프를
# 붙잡아 다른 요청을 막는 일이 없다. async def 로 만들면 오히려 직렬화된다.
@app.post('/predict')
def predict(file: UploadFile = File(..., description='표지판이 담긴 사진')):
    if recognizer is None:
        raise HTTPException(503, '모델 로딩 중입니다.')

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, f'지원하지 않는 형식입니다: {file.content_type}')

    raw = file.file.read()
    if not raw:
        raise HTTPException(400, '빈 파일입니다.')
    if len(raw) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f'{MAX_UPLOAD_MB}MB 이하만 받습니다.')

    try:
        img = Image.open(io.BytesIO(raw))
    except UnidentifiedImageError:
        raise HTTPException(400, '이미지를 읽을 수 없습니다.')

    try:
        result = recognizer.predict(img)
    except Exception:
        log.exception('추론 실패 (%s, %d bytes)', file.filename, len(raw))
        raise HTTPException(500, '추론에 실패했습니다.')

    log.info('%s -> %s (%.2f, %s) %dms',
             file.filename, result['sign'], result['confidence'],
             result['status'], result['elapsedMs'])
    return result
