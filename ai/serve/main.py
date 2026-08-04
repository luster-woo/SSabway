# -*- coding: utf-8 -*-
"""
표지판 인식 HTTP 서버.

Spring 백엔드가 사진을 넘기면 어느 표지판인지 돌려준다.

  POST /predict                사진 1장 → 표지판 id
  WS   /ws/v1/ai/faces         영상 프레임 → 얼굴 좌표 (화상 상담 모자이크용)
  WS   /ws/v1/ai/translation   음성 → 번역 자막 (화상 상담)
  GET  /health                 살아있는지 + 모델이 올라왔는지
  GET  /classes                인식 가능한 표지판 목록
  GET  /docs                   자동 생성된 테스트 화면

실행:
  uvicorn main:app --host 0.0.0.0 --port 8000
"""
import asyncio
import base64
import binascii
import io
import json
import logging
import os
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from face import FaceDetector, resolve_model_path as resolve_face_model_path
from inference import SignRecognizer, resolve_model_paths
from translate import TranslationSession, is_configured as is_speech_configured

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('sign-api')

MAX_UPLOAD_MB = int(os.getenv('MAX_UPLOAD_MB', '15'))
ALLOWED_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}

# 프로세스 하나가 물고 있는 모델. 요청마다 다시 만들지 않는다.
recognizer: SignRecognizer | None = None

# 얼굴 검출기는 연결마다 새로 만든다(face.py 주석 참고). 여기서는 파일 존재만 기억한다.
face_model_ready: bool = False

# 자막도 연결마다 인식기를 만든다. 키가 있는지만 기동 시 확인해 둔다.
speech_ready: bool = False

# 표지판 가중치가 애초에 있었는지. /health 가 "기동 중"과 "아예 없음"을 구분한다.
sign_model_present: bool = False


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

    # 표지판 가중치가 없어도 기동한다.
    #
    # 예전에는 여기서 예외를 던져 서버가 아예 뜨지 않았다. 그러면 로컬에서
    # 자막·얼굴 검출만 개발할 때도 90MB 짜리 가중치를 받아야 했다.
    # (배포에는 영향이 없다 — /opt/models 마운트로 늘 존재한다)
    #
    # 얼굴·자막이 이미 "없으면 그 기능만 닫힌다" 방식이라 여기에 맞춘다.
    # 가중치가 없으면 /predict 만 503 이 되고 나머지는 정상 동작한다.
    global sign_model_present
    det, cls = resolve_model_paths()
    missing = [str(p) for p in (det, cls) if not p.exists()]
    sign_model_present = not missing

    if missing:
        log.warning('표지판 가중치가 없습니다(%s). /predict 는 503 을 돌려줍니다. '
                    'MODEL_DIR 환경변수를 확인하거나 models/ 에 파일을 두세요.',
                    ', '.join(missing))
    else:
        log.info('모델 로딩 시작 (torch threads=%d)', threads)
        recognizer = SignRecognizer(det, cls)
        log.info('모델 로딩 완료 %.2fs | device=%s | %s %dx%d | 클래스 %d개',
                 recognizer.load_seconds, recognizer.device, recognizer.arch,
                 recognizer.input_hw[0], recognizer.input_hw[1], len(recognizer.classes))

    # 얼굴 검출은 표지판과 독립이다 — 모델이 없어도 표지판 인식은 계속 서비스한다
    global face_model_ready
    face_path = resolve_face_model_path()
    face_model_ready = face_path.exists()
    if face_model_ready:
        log.info('얼굴 검출 모델 확인 %s', face_path)
    else:
        log.warning('얼굴 검출 모델이 없습니다(%s). /ws/v1/ai/faces 는 즉시 닫힙니다.', face_path)

    # 자막도 독립이다. 키가 없어도 표지판·얼굴은 그대로 서비스한다.
    global speech_ready
    speech_ready = is_speech_configured()
    if speech_ready:
        log.info('Azure Speech 설정 확인 (region=%s)', os.getenv('AZURE_SPEECH_REGION'))
    else:
        log.warning('AZURE_SPEECH_KEY/REGION 이 없습니다. '
                    '/ws/v1/ai/translation 은 즉시 닫힙니다.')

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
    """
    로드밸런서와 배포 스크립트가 찌르는 곳.

    가중치가 있는데 아직 안 올라왔으면 503 이다(기동 중). 가중치가 아예 없는
    환경(로컬)에서는 표지판만 못 쓰는 것이므로 200 을 준다 — 여기서 503 을
    돌려주면 컨테이너가 영영 unhealthy 로 남아 얼굴·자막까지 못 쓴다.
    """
    if sign_model_present and recognizer is None:
        return JSONResponse(status_code=503, content={'status': 'loading'})

    payload = {
        'status': 'ok',
        # 기능별로 드러내서 배포 후 바로 확인할 수 있게 한다.
        # 하나가 없어도 나머지는 정상 동작하므로 status 를 낮추지 않는다.
        'signRecognition': recognizer is not None,
        'faceDetection': face_model_ready,
        'translation': speech_ready,
    }
    if recognizer is not None:
        payload.update({
            'device': str(recognizer.device),
            'arch': recognizer.arch,
            'inputSize': recognizer.input_hw,
            'classCount': len(recognizer.classes),
        })
    return payload


@app.get('/classes')
def classes():
    if recognizer is None:
        raise HTTPException(503, '모델 로딩 중입니다.')
    return {'classes': recognizer.classes}


@app.websocket('/ws/v1/ai/faces')
async def faces(websocket: WebSocket):
    """
    화상 상담 얼굴 모자이크용 좌표 제공.

      받고  {"frameId": 12, "timestamp": 1712..., "image": "<base64 JPEG>"}
      주고  {"frameId": 12, "timestamp": 1712..., "faces": [
                {"x": 100, "y": 80, "width": 120, "height": 140, "confidence": 0.95}]}

    좌표는 보내온 이미지의 픽셀 기준이다. 브라우저가 원본 해상도로 환산한다
    (useFaceMosaic.ts — 보낸 프레임 크기를 frameId 로 기억해 뒀다가 쓴다).

    ⚠️ 여기 들어오는 프레임은 아직 가려지지 않은 원본이다. 좌표만 뽑고 즉시
       버린다 — 절대 디스크나 로그에 남기지 말 것. 모자이크의 존재 이유가
       사라진다.
    """
    await websocket.accept()

    if not face_model_ready:
        # 그냥 닫는다. 브라우저는 재연결 3회 후 전체 블러로 방어한다
        # (wsFaceDetector.ts MAX_RETRIES). 얼굴이 안 가려진 채 나가는 것보다 낫다.
        log.warning('얼굴 검출 모델이 없어 연결을 닫습니다.')
        await websocket.close(code=1011)
        return

    try:
        detector = FaceDetector()
    except (FileNotFoundError, RuntimeError):
        log.exception('얼굴 검출기 생성 실패')
        await websocket.close(code=1011)
        return

    log.info('얼굴 검출 연결 시작')
    frames = 0

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                message = json.loads(raw)
                frame_id = message['frameId']
                encoded = message['image']
            except (json.JSONDecodeError, KeyError, TypeError):
                log.warning('알 수 없는 형식의 메시지를 버립니다.')
                continue

            # data URL 로 보내는 클라이언트도 받아 준다
            if ',' in encoded[:64] and encoded.lstrip().startswith('data:'):
                encoded = encoded.split(',', 1)[1]

            try:
                image = base64.b64decode(encoded, validate=False)
            except (binascii.Error, ValueError):
                log.warning('frame %s: base64 디코딩 실패', frame_id)
                continue

            try:
                # blocking 추론이라 스레드로 뺀다. 여기서 그냥 부르면 이벤트
                # 루프가 프레임마다 멈춰 다른 연결까지 같이 밀린다.
                boxes = await asyncio.to_thread(detector.detect_jpeg, image)
            except ValueError:
                # 깨진 프레임. 응답하지 않는다 — 빈 목록을 보내면 브라우저가
                # "얼굴 없음" 으로 받아 모자이크를 풀어 버린다.
                log.warning('frame %s: 이미지 디코딩 실패', frame_id)
                continue
            except Exception:
                log.exception('frame %s: 검출 실패', frame_id)
                continue

            await websocket.send_text(json.dumps({
                'frameId': frame_id,
                'timestamp': message.get('timestamp'),
                'faces': boxes,
            }))
            frames += 1

    except WebSocketDisconnect:
        log.info('얼굴 검출 연결 종료 (프레임 %d장)', frames)
    except Exception:
        log.exception('얼굴 검출 연결 오류 (프레임 %d장)', frames)


@app.websocket('/ws/v1/ai/translation')
async def translation(websocket: WebSocket):
    """
    상대방 음성 → 내 언어 자막.

      ① 연결 직후 세션 설정 1건 (텍스트)
         {"speaker":"ADMIN","sourceLanguage":"ko-KR","targetLanguage":"en-US"}
      ② 이후 binary — 16kHz mono PCM16 (pcmStreamer.ts)
      ③ 서버 →
         {"speaker","type":"INTERIM"|"FINAL","sourceLanguage","targetLanguage",
          "sourceText","translatedText"}

    소켓 하나가 화자 한 명을 맡는다. 상담 1건에 양방향 2개가 열린다 —
    인식 언어가 서로 달라 하나로 합칠 수 없다.

    자막이 실패해도 통화는 계속되어야 한다. 여기서 죽으면 소켓만 닫히고
    브라우저는 재연결 3회 후 조용히 포기한다(wsTransport.ts).
    """
    await websocket.accept()

    if not speech_ready:
        log.warning('Azure Speech 설정이 없어 연결을 닫습니다.')
        await websocket.close(code=1011)
        return

    # 첫 메시지는 반드시 세션 설정이다. 오디오부터 오면 어느 언어인지 알 수 없다.
    try:
        config = json.loads(await websocket.receive_text())
        source = config['sourceLanguage']
        target = config['targetLanguage']
        speaker = config.get('speaker')
    except WebSocketDisconnect:
        return
    except (json.JSONDecodeError, KeyError, TypeError):
        log.warning('세션 설정을 읽지 못했습니다.')
        await websocket.close(code=1003)
        return

    loop = asyncio.get_running_loop()
    outbox: asyncio.Queue = asyncio.Queue()

    def emit(payload):
        """Azure SDK 스레드에서 불린다. 루프로 넘기기만 하고 아무것도 더 하지 않는다."""
        payload['speaker'] = speaker
        loop.call_soon_threadsafe(outbox.put_nowait, payload)

    try:
        session = TranslationSession(source, target, emit)
    except (RuntimeError, ValueError) as exception:
        log.warning('자막 세션을 만들지 못했습니다: %s', exception)
        await websocket.close(code=1011)
        return

    log.info('자막 연결 시작 %s → %s (speaker=%s)', source, target, speaker)

    async def pump():
        """SDK 콜백과 전송을 분리한다. 콜백에서 직접 보내면 루프를 침범한다."""
        while True:
            payload = await outbox.get()
            if payload.get('type') == 'CANCELED':
                # 인증 실패·쿼터 초과 등. 브라우저는 재연결로 해결하지 못한다.
                log.error('Azure 인식 취소: %s / %s',
                          payload.get('reason'), payload.get('error'))
                continue
            await websocket.send_text(json.dumps(payload, ensure_ascii=False))

    sender = asyncio.create_task(pump())
    chunks = 0

    try:
        while True:
            message = await websocket.receive()

            if message['type'] == 'websocket.disconnect':
                break

            audio = message.get('bytes')
            if audio:
                session.write(audio)
                chunks += 1
            # 텍스트가 또 오면 무시한다. 설정은 연결당 한 번이다.

    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception('자막 연결 오류')
    finally:
        sender.cancel()
        # stop_continuous_recognition 은 블로킹이라 루프를 막는다
        await asyncio.to_thread(session.close)
        log.info('자막 연결 종료 (조각 %d개)', chunks)


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
