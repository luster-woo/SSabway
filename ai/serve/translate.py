# -*- coding: utf-8 -*-
"""
실시간 번역 자막 (Azure Speech Translation).

화상 상담에서 상대방 말을 내 언어로 번역해 자막으로 띄운다.
"듣는 쪽이 자기 언어로 번역해 받는" 구조라, 소켓 하나가 화자 한 명을 맡는다.

    사용자 화면 : 역무원 음성(ko) → 사용자 언어
    역무원 화면 : 사용자 음성      → ko

역무원은 항상 한국어를 쓴다는 전제다.

인식과 번역을 Azure 한 번 호출로 끝낸다. STT 결과를 다시 번역 API 에 넣으면
왕복이 두 번이라 자막이 늦고, 문장 경계도 어긋난다.
"""
import os

import azure.cognitiveservices.speech as speechsdk

# 프론트가 보내는 BCP-47 → Azure 번역 대상 코드.
#
# 인식 언어(speech_recognition_language)는 BCP-47 을 그대로 쓰지만
# 번역 대상(add_target_language)은 짧은 코드다. 특히 중국어 간체는
# zh-CN 이 아니라 zh-Hans 다 — 틀리면 조용히 빈 번역이 돌아온다.
TARGET_CODES = {
    'ko-KR': 'ko', 'ko': 'ko',
    'en-US': 'en', 'en': 'en',
    'ja-JP': 'ja', 'ja': 'ja',
    'zh-CN': 'zh-Hans', 'zh': 'zh-Hans', 'zh-Hans': 'zh-Hans',
}

# 말이 끝났다고 판단하기까지 기다리는 시간. 통화에서는 짧아야 자막이 빨리 뜬다.
# 프론트 VAD 가 발화 뒤 꼬리를 이 값보다 길게 보내 줘야 문장이 확정된다
# (pcmStreamer.ts 의 TAIL_MS 주석 참고).
SEGMENTATION_SILENCE_MS = '500'

# pcmStreamer 가 만드는 형식과 반드시 같아야 한다
SAMPLE_RATE = 16_000
BITS_PER_SAMPLE = 16
CHANNELS = 1


def credentials():
    return os.getenv('AZURE_SPEECH_KEY'), os.getenv('AZURE_SPEECH_REGION')


def is_configured():
    key, region = credentials()
    return bool(key and region)


class TranslationSession:
    """
    소켓 하나에 붙는 인식기.

    Azure SDK 는 자기 스레드에서 콜백을 부른다. on_event 는 그 스레드에서
    호출되므로, 이벤트 루프를 건드리는 일(웹소켓 전송 등)을 여기서 직접 하면
    안 된다. 호출부가 loop.call_soon_threadsafe 로 넘기는 것을 전제한다.
    """

    def __init__(self, source_language, target_language, on_event):
        key, region = credentials()
        if not key or not region:
            raise RuntimeError('AZURE_SPEECH_KEY / AZURE_SPEECH_REGION 이 없습니다.')

        target = TARGET_CODES.get(target_language)
        if target is None:
            raise ValueError(f'지원하지 않는 번역 대상 언어: {target_language}')

        self.source_language = source_language
        self.target_language = target_language
        self._target = target
        self._on_event = on_event

        config = speechsdk.translation.SpeechTranslationConfig(
            subscription=key, region=region)
        config.speech_recognition_language = source_language
        config.add_target_language(target)
        config.set_property(
            speechsdk.PropertyId.Speech_SegmentationSilenceTimeoutMs,
            SEGMENTATION_SILENCE_MS)

        # 마이크가 아니라 우리가 밀어 넣는 스트림에서 읽게 한다.
        # 브라우저가 보내는 PCM 을 그대로 write() 하면 된다.
        stream_format = speechsdk.audio.AudioStreamFormat(
            samples_per_second=SAMPLE_RATE,
            bits_per_sample=BITS_PER_SAMPLE,
            channels=CHANNELS)
        self._push = speechsdk.audio.PushAudioInputStream(stream_format=stream_format)

        self._recognizer = speechsdk.translation.TranslationRecognizer(
            translation_config=config,
            audio_config=speechsdk.audio.AudioConfig(stream=self._push))

        self._recognizer.recognizing.connect(self._handle_recognizing)
        self._recognizer.recognized.connect(self._handle_recognized)
        self._recognizer.canceled.connect(self._handle_canceled)

        self._recognizer.start_continuous_recognition_async()

    def write(self, pcm: bytes):
        self._push.write(pcm)

    def close(self):
        """블로킹이다. 이벤트 루프에서 부르지 말 것 (asyncio.to_thread 로 감쌀 것)."""
        try:
            self._push.close()
        finally:
            self._recognizer.stop_continuous_recognition_async().get()

    # ── Azure 콜백 (SDK 스레드) ────────────────────────────────

    def _handle_recognizing(self, event):
        """
        말하는 도중. Azure 가 부분 번역을 줄 때만 흘려보낸다.

        번역이 아직 비어 있으면 보내지 않는다 — 프론트는 translatedText 가
        문자열일 때만 렌더링하고, 빈 문자열을 보내면 자막이 깜빡인다.
        """
        text = event.result.translations.get(self._target)
        if text:
            self._emit('INTERIM', event.result.text, text)

    def _handle_recognized(self, event):
        result = event.result
        if result.reason != speechsdk.ResultReason.TranslatedSpeech:
            return
        text = result.translations.get(self._target)
        if text:
            self._emit('FINAL', result.text, text)

    def _handle_canceled(self, event):
        details = event.result.cancellation_details
        reason = str(details.reason)
        error = details.error_details if details.reason == \
            speechsdk.CancellationReason.Error else None
        self._on_event({'type': 'CANCELED', 'reason': reason, 'error': error})

    def _emit(self, kind, source_text, translated_text):
        self._on_event({
            'type': kind,
            'sourceLanguage': self.source_language,
            'targetLanguage': self.target_language,
            'sourceText': source_text,
            'translatedText': translated_text,
        })
