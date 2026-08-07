package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.dto.OpenViduWebhookRequest;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.Recording;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpenViduWebhookService {

    /**
     * DB 저장 재시도 횟수.
     *
     * 상담 행이 종료 트랜잭션에 잠겨 있을 수 있어 첫 시도가 실패할 수 있습니다.
     * 잠금 구간을 줄여 놨지만(ConsultationEndStateService) 완전히 없앨 수는
     * 없으므로, 짧게 기다렸다 다시 시도합니다. 재시도는 반드시 새 트랜잭션
     * 이어야 해서 @Transactional 메서드 바깥에서 반복합니다.
     */
    private static final int MAX_SAVE_ATTEMPTS = 3;

    private static final long SAVE_RETRY_DELAY_MS = 500L;

    private final OpenVidu openVidu;

    private final RecordingStorageService recordingStorageService;

    private final ConsultationRecordingService consultationRecordingService;


    public void handle(OpenViduWebhookRequest request) {
        if(!"recordingStatusChanged".equals(request.getEvent())){
            return;
        }

        if(!"ready".equalsIgnoreCase(request.getStatus())){
            return;
        }

        if (request.getId() == null || request.getId().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_WEBHOOK_REQUEST);
        }

        try {
            Recording recording = openVidu.getRecording(request.getId());

            // 처리가 완료된 녹음 파일을 다운로드해 S3에 저장합니다.
            String s3ObjectKey = recordingStorageService.uploadRecording(recording);

            log.info(
                "녹음 파일 S3 업로드 완료 - recordingId={}, objectKey={}",
                recording.getId(),
                s3ObjectKey
            );

            // S3 업로드가 성공한 경우에만 상담 테이블에 객체 키 저장
            saveRecordS3WithRetry(
                recording.getSessionId(),
                s3ObjectKey
            );

        } catch (OpenViduJavaClientException | OpenViduHttpException exception) {
            throw new BusinessException(
                ErrorCode.OPENVIDU_COMMUNICATION_FAILED,
                exception
            );
        }

    }

    /**
     * S3 경로를 DB에 저장합니다. 실패해도 예외를 올리지 않습니다.
     *
     * ⚠️ 이 지점이 녹취 유실의 급소입니다. 바로 위에서 S3 업로드가 이미
     *    끝났기 때문에, 여기서 예외가 올라가면 파일은 S3에 남고 DB에는
     *    경로가 없는 상태가 됩니다. 그런데 OpenVidu CE는 웹훅을 재시도하지
     *    않으므로 그대로 영구 유실이었습니다.
     *
     * 그래서 세 가지를 합니다.
     *   1. 잠금 경합 같은 일시적 실패는 짧게 기다렸다 다시 시도한다.
     *   2. 끝내 실패하면 ERROR로 남긴다 — 로그에 상담 세션과 객체 키가 다
     *      들어 있어 수동 복구가 가능하고, 무엇보다 실패했다는 사실 자체가
     *      드러난다. 예전에는 실패해도 아무 기록이 없었다.
     *   3. 예외를 삼켜 200으로 응답한다. 500을 돌려줘도 OpenVidu CE는 웹훅을
     *      재시도하지 않아 달라지는 것이 없고, 로그만 시끄러워진다.
     *
     * ⚠️ 자동 복구 경로는 없다. 실패한 건은 위 ERROR 로그를 보고 사람이
     *    채워야 한다. S3 객체 키가 상담 ID와 녹음 ID로 결정적으로 만들어지므로
     *    (RecordingStorageService.createObjectKey) DB에 남은 record_id 만으로도
     *    경로를 되살릴 수 있다.
     */
    private void saveRecordS3WithRetry(String sessionId, String s3ObjectKey) {

        for (int attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt++) {
            try {
                consultationRecordingService.saveRecordS3(
                    sessionId,
                    s3ObjectKey
                );
                return;

            } catch (RuntimeException exception) {
                if (attempt == MAX_SAVE_ATTEMPTS) {
                    log.error(
                        "상담 녹음 S3 경로 저장에 최종 실패했습니다. "
                            + "S3에는 파일이 있으나 DB 경로가 비어 있습니다. "
                            + "sessionId={}, objectKey={}",
                        sessionId,
                        s3ObjectKey,
                        exception
                    );
                    return;
                }

                log.warn(
                    "상담 녹음 S3 경로 저장 실패, 재시도합니다. "
                        + "attempt={}/{}, sessionId={}",
                    attempt,
                    MAX_SAVE_ATTEMPTS,
                    sessionId,
                    exception
                );

                sleepBeforeRetry();
            }
        }
    }

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(SAVE_RETRY_DELAY_MS);
        } catch (InterruptedException exception) {
            // 중단 신호를 복구해 상위 실행 흐름이 중단 상태를 인식하게 합니다.
            Thread.currentThread().interrupt();
        }
    }
}
