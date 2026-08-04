package com.ssafy.ssabway.domain.consultation.client;

import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/*
 * 메인 백엔드에서 WebRTC 서버의 내부 API를 호출
 *
 * 상담과 역무원 권한 검증 및 상태 변경은 메인 백엔드가 담당하고,
 * OpenVidu 세션과 Connection Token 생성만 WebRTC 서버에 요청
 */
@Component
public class WebRtcClient {

    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final RestClient restClient;
    private final String internalSecret;

    public WebRtcClient(
            @Value("${webrtc.base-url}")
            String baseUrl,
            @Value("${webrtc.api-key}")
            String internalSecret
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        this.internalSecret = internalSecret;
    }

    // 상담 ID와 역무원 ID를 전달하여 OpenVidu 세션과 STAFF 토큰을 생성
    public WebRtcConnectionResponse createStaffConnection(
            Long consultationId,
            Long staffId
    ) {
        try {
            WebRtcConnectionResponse response =
                    restClient.post().uri("/internal/v1/openvidu/consultations/{consultationId}/staff-connection",
                                    consultationId)
                            .header(INTERNAL_SECRET_HEADER,
                                    internalSecret)
                            .body(new WebRtcConnectionRequest(staffId))
                            .retrieve()
                            .body(WebRtcConnectionResponse.class);

            if (response == null) {
                throw new BusinessException(ErrorCode.WEBRTC_SERVER_ERROR);
            }

            return response;

        } catch (RestClientException exception) {
            throw new BusinessException(ErrorCode.WEBRTC_SERVER_ERROR);
        }
    }
}