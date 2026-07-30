package com.ssafy.ssabway.domain.user.service;

import com.ssafy.ssabway.domain.user.dto.request.PasswordResetSendRequest;
import com.ssafy.ssabway.domain.user.dto.response.PasswordResetSendResponse;
import com.ssafy.ssabway.domain.user.entity.Provider;
import com.ssafy.ssabway.domain.user.entity.User;
import com.ssafy.ssabway.domain.user.repository.UserRepository;
import com.ssafy.ssabway.domain.user.util.PasswordResetMailSender;
import com.ssafy.ssabway.domain.user.util.VerificationMailSender;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class PasswordResetService {


    //  가입 인증(verify:*)과 키 분리
    //  공유하면 재설정용으로 받은 인증이 회원가입에도 통하고,
    //  발송 카운터를 공유해 가입 시도로 5회를 소진한 사람이 재설정도 못 하게 됨.
    private static final String CODE_KEY_PREFIX = "reset:code:";
    private static final String SEND_KEY_PREFIX = "reset:send:";
    private static final String TRY_KEY_PREFIX = "reset:try:";
    private static final String DONE_KEY_PREFIX = "reset:done:";

    private static final int CODE_TTL_SECONDS = 300;
    private static final int SEND_TTL_SECONDS = 3600;
    private static final int DONE_TTL_SECONDS = 1800;

    private static final int SEND_LIMIT = 5;
    private static final int TRY_LIMIT = 5;

    // I / 1 / O / 0 제외. 메일에서 눈으로 읽고 옮겨 적을 때 가장 많이 틀리는 조합
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 7;

    // Random은 시드 예측이 가능해 부적합
    private final SecureRandom secureRandom = new SecureRandom();

    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;
    private final PasswordResetMailSender mailSender;

    public PasswordResetSendResponse sendCode(PasswordResetSendRequest request) {
        // 이메일 정규화
        String email = request.email().trim().toLowerCase();

        // 회원가입 과정과 조건이 반대 - 해당 이메일 계정이 있는지부터 확인
        User user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.getProvider() != Provider.LOCAL) throw new BusinessException(ErrorCode.SOCIAL_LOGIN_REQUIRED);

        Long sendCount = redisTemplate.opsForValue().increment(SEND_KEY_PREFIX + email);

        if (sendCount == 1L) {
            redisTemplate.expire(SEND_KEY_PREFIX + email, Duration.ofSeconds(SEND_TTL_SECONDS));
        }

        if (sendCount > SEND_LIMIT) {
            throw new BusinessException(ErrorCode.EMAIL_SEND_LIMIT_EXCEEDED);
        }

        String code = generateCode();

        redisTemplate.opsForValue().set(
                CODE_KEY_PREFIX + email,
                code,
                Duration.ofSeconds(CODE_TTL_SECONDS)
        );

        redisTemplate.delete(TRY_KEY_PREFIX + email);

        mailSender.send(email, code, request.language(), CODE_TTL_SECONDS);

        return new PasswordResetSendResponse(CODE_TTL_SECONDS);
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_CHARS.charAt(secureRandom.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
