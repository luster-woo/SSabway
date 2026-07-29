package com.ssafy.ssabway.domain.user.service;

import com.ssafy.ssabway.domain.user.dto.request.EmailVerificationSendRequest;
import com.ssafy.ssabway.domain.user.dto.response.EmailVerificationSendResponse;
import com.ssafy.ssabway.domain.user.repository.UserRepository;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmailVerificationService {

    // Redis 저장 시 활용되는 접두사
    // code : 이메일 인증 코드, send : 이메일 발송 횟수
    private static final String CODE_KEY_PREFIX = "verify:code:";
    private static final String SEND_KEY_PREFIX = "verify:send:";

    // Redis TTL과 timeLimit이 동일한 상수 사용
    private static final int CODE_TTL_SECONDS = 300;

    // 1시간 내로 특정 이메일 주소에 보낼 수 있는 횟수 (1시간 유지)
    private static final int SEND_LIMIT = 5;
    private static final Duration SEND_LIMIT_TTL = Duration.ofHours(1);

    // 인증 코드 (알파벳 + 영어 7자리)
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 7;

    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;
    private final VerificationMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    public EmailVerificationSendResponse sendCode(EmailVerificationSendRequest request) {
        // 이메일 정규화
        String email = request.email().trim().toLowerCase();

        // 이미 가입된 이메일인 경우, 에러 발생
        if (userRepository.existsByEmail(email)) throw new BusinessException(ErrorCode.EMAIL_DUPLICATED);

        increaseSendCount(email);

        String code = generateCode();
        redisTemplate.opsForValue().set(CODE_KEY_PREFIX + email, code, Duration.ofSeconds(CODE_TTL_SECONDS));

        mailSender.send(email, code, request.language(), CODE_TTL_SECONDS);

        return new EmailVerificationSendResponse(CODE_TTL_SECONDS);
    }

    // 전송 횟수 증가
    public void increaseSendCount(String email) {

        String key = SEND_KEY_PREFIX + email;

        Long count = redisTemplate.opsForValue().increment(key);

        if (count == null) throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);

        // 1이면 첫 발송이므로 TTL 설정
        if (count == 1L) redisTemplate.expire(key, SEND_LIMIT_TTL);

        // SEND_LIMIT을 넘길 경우 429 발생
        if (count > SEND_LIMIT) {
            throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS);
        }
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_CHARS.charAt(secureRandom.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}