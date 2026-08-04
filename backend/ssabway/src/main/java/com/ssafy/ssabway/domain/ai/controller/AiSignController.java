package com.ssafy.ssabway.domain.ai.controller;

import com.ssafy.ssabway.domain.ai.dto.response.SignPredictResponse;
import com.ssafy.ssabway.domain.ai.service.AiSignService;
import com.ssafy.ssabway.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiSignController {

    private final AiSignService aiSignService;

    /*
        촬영한 표지판 사진에서 어느 표지판인지 알아낸다.

        multipart 필드명은 image 다 (프론트 predictSign.ts 와 맞춘 이름).
        SecurityConfig 의 permitAll 목록에 없으므로 로그인 토큰이 필요하다.
     */
    @PostMapping("/signs/predict")
    public ResponseEntity<ApiResponse<SignPredictResponse>> predictSign(
            @RequestPart("image") MultipartFile image) {

        SignPredictResponse response = aiSignService.predict(image);

        return ResponseEntity.ok(ApiResponse.ok("표지판을 인식했습니다.", response));
    }
}
