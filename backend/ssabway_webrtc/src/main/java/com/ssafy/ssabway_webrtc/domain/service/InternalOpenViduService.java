package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.domain.dto.InternalConnectionResponse;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 메인 백엔드가 수락한 상담의 OpenVidu 세션과 STAFF 토큰을 생성
 *
 * 상담 상태 및 역무원 권한은 메인 백엔드가 검증하므로,
 * 이 서비스는 OpenVidu 연결 정보 생성만 담당
 */
@Service
@RequiredArgsConstructor
public class InternalOpenViduService {

    private final OpenViduService openViduService;

    public InternalConnectionResponse createStaffConnection(
        Long consultationId,
        Long staffId
    ) throws OpenViduJavaClientException,
        OpenViduHttpException {

        String sessionId = null;

        try {
            sessionId = openViduService.createSession(consultationId);

            String token = openViduService.createConnection(
                    sessionId,
                    staffId.toString(),
                    "STAFF"
                );

            return new InternalConnectionResponse(
                sessionId,
                token
            );

        } catch (
            OpenViduJavaClientException | OpenViduHttpException | RuntimeException exception
        ) {
            closeSessionQuietly(sessionId);
            throw exception;
        }
    }

    // 토큰 생성 실패 시 사용되지 않는 OpenVidu 세션을 정리
    private void closeSessionQuietly(
        String sessionId
    ) {
        if (sessionId == null) {
            return;
        }

        try {
            openViduService.closeSessionIfActive(sessionId);
        } catch (
            OpenViduJavaClientException |
            OpenViduHttpException ignored
        ) {
            // 원래 발생한 연결 생성 예외가 유지되도록 정리 오류는 전파하지 않음
        }
    }
}
