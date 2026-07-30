package com.ssafy.ssabway_webrtc.domain.service;

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
            throw new IllegalArgumentException("녹화 ID가 없습니다.");
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
            consultationRecordingService.saveRecordS3(
                recording.getSessionId(),
                s3ObjectKey
            );

        } catch (OpenViduJavaClientException | OpenViduHttpException exception) {
            throw new IllegalStateException("완료된 녹음 정보를 조회할 수 없습니다.", exception);
        }

    }
}
