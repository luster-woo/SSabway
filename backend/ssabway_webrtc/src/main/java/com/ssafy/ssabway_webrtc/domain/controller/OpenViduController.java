package com.ssafy.ssabway_webrtc.domain.controller;

import com.ssafy.ssabway_webrtc.common.jwt.TokenType;
import com.ssafy.ssabway_webrtc.common.response.ApiResponse;
import com.ssafy.ssabway_webrtc.domain.dto.*;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationAuthorizationService;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationEndService;
import com.ssafy.ssabway_webrtc.domain.service.ConsultationStartService;
import com.ssafy.ssabway_webrtc.domain.service.OpenViduService;
import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/openvidu")
@RequiredArgsConstructor
public class OpenViduController {

    private final OpenViduService openViduService;

    private final ConsultationAuthorizationService consultationAuthorizationService;

    private final ConsultationStartService consultationStartService;

    private final ConsultationEndService consultationEndService;


    @PostMapping("/sessions/{sessionId}/connections")
    public ApiResponse<ConnectionCreateResponse> createConnection(
        @PathVariable String sessionId,
        Authentication authentication
    ) throws OpenViduJavaClientException,
        OpenViduHttpException {

        /*
         * JwtAuthenticationFilter가 JWT의 sub를 Long 타입 principal로
         * 저장했으므로 로그인한 사용자 또는 역무원 ID로 사용.
         */
        Long participantId =
            (Long) authentication.getPrincipal();

        /*
         * JWT의 type 클레임에서 생성된 권한.
         * 현재 인증 서버는 USER 또는 STAFF 권한 하나를 저장.
         */
        String authority = authentication
            .getAuthorities()
            .iterator()
            .next()
            .getAuthority();

        TokenType participantType =
            TokenType.valueOf(authority);

        /*
         * JWT 인증 성공 여부와 상담 참여 권한은 서로 다름.
         * 다른 상담의 세션 ID를 이용한 토큰 발급을 차단하기 위해
         * DB의 requesterUserId 또는 staffId와 인증 ID를 비교.
         */
        consultationAuthorizationService
            .validateParticipant(
                sessionId,
                participantId,
                participantType
            );

        /*
         * 모든 인증·인가 검증을 통과한 이후에만 OpenVidu 연결 토큰을
         * 생성하며, 연결 메타데이터에도 검증된 ID와 역할을 저장.
         */
        String token = openViduService.createConnection(
            sessionId,
            participantId.toString(),
            participantType.name()
        );

        return ApiResponse.ok(
            new ConnectionCreateResponse(
                sessionId,
                token
            )
        );
    }

    @PostMapping("/sessions/{sessionId}/start")
    public ApiResponse<ConsultationStartResponse> startConsultation(
        @PathVariable String sessionId
    ) throws OpenViduJavaClientException, OpenViduHttpException{
        return ApiResponse.ok(consultationStartService.startConsultation(sessionId));
    }


    @PostMapping("/sessions/{sessionId}/end")
    public ApiResponse<ConsultationEndResponse> endConsultation(
        @PathVariable String sessionId,
        Authentication authentication
    )
        throws OpenViduJavaClientException, OpenViduHttpException {

        Long staffId = (Long) authentication.getPrincipal();

        consultationAuthorizationService.validateParticipant(
            sessionId,
            staffId,
            TokenType.STAFF
        );

        return  ApiResponse.ok(consultationEndService.endConsultation(sessionId));
    }

}
