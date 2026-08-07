package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.domain.dto.ConsultationEndResponse;
import com.ssafy.ssabway_webrtc.domain.entity.ConsultationStatus;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationEndStateService.EndTransition;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import io.openvidu.java.client.Recording;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 상담 종료 — 상태 전이 후 OpenVidu 녹음·세션 정리.
 *
 * ⚠️ 이 클래스에 @Transactional을 붙이지 마세요.
 *
 * 아래 OpenVidu 호출들이 트랜잭션 안에 들어가면 상담 행 잠금이 HTTP 왕복
 * 내내 유지되고, 그 사이 도착하는 녹음 완료(ready) 웹훅의 record_s3 UPDATE가
 * 같은 행에서 막힙니다. 잠금 타임아웃까지 가면 웹훅이 실패하는데 OpenVidu는
 * 재시도하지 않으므로 녹취 경로가 영구히 유실됩니다.
 * (자세한 배경은 ConsultationEndStateService 주석 참고)
 *
 * 상태 전이를 먼저 커밋하는 것은 프론트 쪽 요구이기도 합니다 — 역무원 화면이
 * sessionDisconnected를 받고 목록을 재조회할 때 이미 ENDED가 보여야 민원
 * 기록에 바로 나타납니다. (AdminConsultationPage 주석)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultationEndService {

    private final OpenViduService openViduService;

    private final ConsultationEndStateService consultationEndStateService;

    public ConsultationEndResponse endConsultation(
        String sessionId
    ) throws OpenViduJavaClientException, OpenViduHttpException {

        // 1) 짧은 트랜잭션으로 상태만 전이하고 곧바로 커밋 — 행 잠금 해제
        EndTransition transition =
            consultationEndStateService.markEnded(sessionId);

        // 이미 종료된 상담이면 OpenVidu는 지난 호출에서 정리됐다
        if (transition.alreadyEnded()) {
            return new ConsultationEndResponse(
                sessionId,
                transition.recordId(),
                ConsultationStatus.ENDED
            );
        }

        // 2) 잠금이 풀린 상태에서 OpenVidu 자원 정리
        releaseOpenViduResources(
            sessionId,
            transition.recordId()
        );

        return new ConsultationEndResponse(
            sessionId,
            transition.recordId(),
            ConsultationStatus.ENDED
        );
    }

    /**
     * 녹음을 멈추고 세션을 닫습니다.
     *
     * 최선형입니다 — 실패해도 예외를 올리지 않습니다. 상담은 이미 ENDED로
     * 기록됐고, 통화가 끝난 것은 사실이라 OpenVidu 쪽 이상으로 그 사실을
     * 되돌리면 사용자가 다음 요청을 못 하게 됩니다(활성 상담 중복 차단).
     *
     * 다만 여기서 실패하면 녹음이 완료되지 않아 웹훅이 오지 않고 녹취가
     * 비게 되므로, 나중에 추적할 수 있도록 ERROR로 남깁니다. 자동 복구
     * 경로는 없습니다 — 이 로그가 유일한 단서입니다.
     */
    private void releaseOpenViduResources(
        String sessionId,
        String recordId
    ) {
        try {
            if (recordId != null && !recordId.isBlank()) {
                stopRecordingIfRunning(sessionId, recordId);
            } else {
                log.error(
                    "녹음 ID 없이 상담이 종료됐습니다. 녹취가 남지 않습니다. sessionId={}",
                    sessionId
                );
            }

            openViduService.closeSessionIfActive(sessionId);

        } catch (OpenViduJavaClientException | OpenViduHttpException exception) {
            log.error(
                "OpenVidu 자원 정리에 실패했습니다. sessionId={}, recordId={}",
                sessionId,
                recordId,
                exception
            );
        }
    }

    private void stopRecordingIfRunning(
        String sessionId,
        String recordId
    ) throws OpenViduJavaClientException, OpenViduHttpException {

        Recording recording = openViduService.getRecording(recordId);

        if (!sessionId.equals(recording.getSessionId())) {
            log.error(
                "상담 세션과 녹음 정보가 일치하지 않습니다. sessionId={}, recordingSessionId={}",
                sessionId,
                recording.getSessionId()
            );
            return;
        }

        if (recording.getStatus() == Recording.Status.started) {
            openViduService.stopAudioRecording(recordId);
            return;
        }

        // stopped·ready는 이미 정지된 정상 상태다. 그 밖이면 녹취가 비게 된다.
        if (recording.getStatus() != Recording.Status.stopped &&
            recording.getStatus() != Recording.Status.ready) {

            log.error(
                "녹음이 비정상 상태로 종료됐습니다. recordId={}, status={}",
                recordId,
                recording.getStatus()
            );
        }
    }
}
