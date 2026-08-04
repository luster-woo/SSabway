# -*- coding: utf-8 -*-
"""
얼굴 검출 (YuNet).

화상 상담에서 사용자 카메라에 잡힌 주변 사람의 얼굴을 가리기 위해 좌표만
찾아 돌려준다. 모자이크 자체는 브라우저가 canvas 로 처리한다
(frontend/src/user/features/mosaic/mosaicPipeline.ts).

표지판 인식(inference.py)과 완전히 별개다. 모델도 다르고 — 표지판 검출기는
표지판만 찾는다 — 호출 경로도 WebSocket 으로 따로다.

YuNet 을 고른 이유는 크기와 속도다. 227KB 짜리 ONNX 하나로 320x240 을
약 4ms 에 처리한다. 초당 4장씩 보내는 지금 설계에서는 동시 상담 10건이
0.2 코어도 쓰지 않는다.
"""
import os
from pathlib import Path

import cv2
import numpy as np

DEFAULT_MODEL_NAME = 'face_detection_yunet_2023mar.onnx'

# 프로토타입(face_fps_test)에서 눈으로 맞춘 값
SCORE_THRESHOLD = 0.6
NMS_THRESHOLD = 0.3
TOP_K = 50

# YuNet 은 생성 시 입력 크기를 요구하지만 첫 detect 에서 실제 크기로 덮어쓴다
INIT_SIZE = (320, 320)


def resolve_model_path():
    """
    가중치 위치. 표지판 모델과 달리 기본값을 코드 옆으로 둔다.

    227KB 이고 업스트림(OpenCV Zoo)에서 받은 그대로라 재학습할 일이 없다.
    이미지에 넣어 두면 /opt/models 마운트를 인프라와 맞출 필요가 없다.
    """
    override = os.getenv('FACE_MODEL_PATH')
    if override:
        return Path(override)
    return Path(__file__).resolve().parent / DEFAULT_MODEL_NAME


class FaceDetector:
    """
    연결 하나가 독점하는 검출기.

    cv2.FaceDetectorYN 은 setInputSize 로 내부 상태를 바꾼다. 여러 연결이
    하나를 공유하면 해상도가 섞여 좌표가 어긋난다. 생성 비용이 8ms 뿐이라
    WebSocket 연결마다 새로 만드는 편이 안전하고 충분히 싸다.
    """

    def __init__(self, model_path=None):
        path = Path(model_path) if model_path else resolve_model_path()
        if not path.exists():
            raise FileNotFoundError(f'얼굴 검출 모델이 없습니다: {path}')
        if not hasattr(cv2, 'FaceDetectorYN'):
            raise RuntimeError(
                f'이 OpenCV({cv2.__version__})에는 FaceDetectorYN 이 없습니다. 4.5.4 이상 필요')

        self.model_path = path
        self._net = cv2.FaceDetectorYN.create(
            str(path), '', INIT_SIZE, SCORE_THRESHOLD, NMS_THRESHOLD, TOP_K)
        self._size = (0, 0)

    def detect_jpeg(self, data: bytes):
        """
        JPEG 바이트 → 얼굴 박스 목록.

        디코딩 실패는 예외로 올린다. 빈 목록으로 돌려주면 호출부가 그것을
        "얼굴 없음" 으로 받아 모자이크를 풀어 버린다 — 가장 위험한 실패다.
        """
        frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError('이미지를 디코딩하지 못했습니다.')
        return self.detect(frame)

    def detect(self, frame):
        height, width = frame.shape[:2]

        # 입력 해상도가 바뀌면 다시 알려줘야 한다
        if (width, height) != self._size:
            self._net.setInputSize((width, height))
            self._size = (width, height)

        _, faces = self._net.detect(frame)
        if faces is None:
            return []

        boxes = []
        for face in faces:
            x, y, w, h = (float(v) for v in face[:4])

            # YuNet 은 프레임 밖으로 나가는 좌표를 낼 수 있다. 브라우저도 다시
            # 자르지만, 음수 폭이 넘어가면 정규화 단계에서 뒤집히므로 여기서 정리한다.
            x0 = max(0.0, x)
            y0 = max(0.0, y)
            x1 = min(float(width), x + w)
            y1 = min(float(height), y + h)
            if x1 <= x0 or y1 <= y0:
                continue

            boxes.append({
                # 프론트 계약은 width/height 다 (프로토타입의 w/h 와 이름이 다르다)
                'x': int(round(x0)),
                'y': int(round(y0)),
                'width': int(round(x1 - x0)),
                'height': int(round(y1 - y0)),
                'confidence': round(float(face[-1]), 4),
            })
        return boxes
