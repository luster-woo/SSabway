package com.ssafy.ssabway.temp;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 커밋 전 삭제할 임시 클래스
@RestController
@RequiredArgsConstructor
public class TempHashController {

    private final PasswordEncoder passwordEncoder;

    @GetMapping("/api/v1/auth/temp-hash")
    public String hash(@RequestParam String raw) {
        return passwordEncoder.encode(raw);
    }
}