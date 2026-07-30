package com.ssafy.ssabway_webrtc.domain.controller;

import com.ssafy.ssabway_webrtc.domain.dto.OpenViduWebhookRequest;
import com.ssafy.ssabway_webrtc.domain.service.OpenViduWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/openvidu/webhooks")
@RequiredArgsConstructor
public class OpenViduWebhookController {
    private static final String WEBHOOK_SECRET_HEADER = "X-OpenVidu-Webhook-Secret";

    private final OpenViduWebhookService openViduWebhookService;

    @Value("${openvidu.webhook-secret}")
    private String webhookSecret;

    @PostMapping
    public ResponseEntity<Void> receiveWebhook(
        @RequestHeader(WEBHOOK_SECRET_HEADER) String requestSecret,
        @RequestBody OpenViduWebhookRequest request) {

        if(!webhookSecret.equals(requestSecret)){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        openViduWebhookService.handle(request);

        return ResponseEntity.ok().build();

    }
}
