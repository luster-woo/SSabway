package com.ssafy.ssabway.domain.user.service;

import com.ssafy.ssabway.domain.user.dto.request.EmailVerificationConfirmRequest;
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

    // try : 이메일 인증 시도 횟수, done : 이메일 성공 여부 저장
    private static final String TRY_KEY_PREFIX = "verify:try:";
    private static final String DONE_KEY_PREFIX = "verify:done:";

    // Redis TTL과 timeLimit이 동일한 상수 사용
    private static final int CODE_TTL_SECONDS = 300;

    // 1시간 내로 특정 이메일 주소에 보낼 수 있는 횟수 (1시간 유지)
    private static final int SEND_LIMIT = 5;
    private static final Duration SEND_LIMIT_TTL = Duration.ofHours(1);

    // 이메일 인증 최대 횟수 5회로 제한, 시도 횟수 TTL 또한 이메일 코드 TTL과 동일하게 설정
    // 인증을 성공하게 된다면 해당 이메일 인증 성공 여부를 30분 동안 저장
    private static final int TRY_LIMIT = 5;
    private static final Duration TRY_LIMIT_TTL = Duration.ofSeconds(CODE_TTL_SECONDS);
    private static final Duration DONE_TTL = Duration.ofMinutes(30);

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

        // 재발송 시 이전 코드에 대한 시도 횟수 초기화 (이게 남아 있으면 로직 상 이상함)
        redisTemplate.delete(TRY_KEY_PREFIX + email);

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
            throw new BusinessException(ErrorCode.EMAIL_SEND_LIMIT_EXCEEDED);
        }
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_CHARS.charAt(secureRandom.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }

    public void confirmCode(EmailVerificationConfirmRequest request){
        // 이메일 정규화
        String email = request.email().trim().toLowerCase();

        // 코드는 대문자로 생성되므로 입력값도 대문자로 정규화
        String code = request.code().trim().toUpperCase();

        String codeKey = CODE_KEY_PREFIX + email;
        String savedCode = redisTemplate.opsForValue().get(codeKey);

        // 코드가 없으면 TTL 만료 또는 발송을 안 한 상태
        // 불일치와 구분해야 함 (사용자가 취할 행동이 다름: 재입력 vs 재발송)
        if (savedCode == null) {
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_EXPIRED);
        }

        increaseTryCount(email, codeKey);

        // 일치하지 않으면 400 발생
        if(!savedCode.equals(code)) {
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_MISMATCH);
        }

        // 인증 완료 표시 - 회원가입 시 해당 키의 존재를 확인하고 진행
        redisTemplate.opsForValue().set(DONE_KEY_PREFIX + email, "true", DONE_TTL);

        // 인증 코드와 시도 횟수는 삭제
        redisTemplate.delete(codeKey);
        redisTemplate.delete(TRY_KEY_PREFIX + email);
    }

    private void increaseTryCount(String email, String codeKey) {
        String key = TRY_KEY_PREFIX + email;
        Long count = redisTemplate.opsForValue().increment(key);

        if (count == null) throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);

        if (count == 1L) redisTemplate.expire(key, TRY_LIMIT_TTL);

        if (count > TRY_LIMIT) {
            redisTemplate.delete(codeKey);
            throw new BusinessException(ErrorCode.VERIFICATION_ATTEMPT_EXCEEDED);
        }
    }

    // 회원 가입 시점에 이메일 인증 완료 여부를 확인 (verify:done: 키를 check)
    public void validateVerified(String email) {
        Boolean verified = redisTemplate.hasKey(DONE_KEY_PREFIX + email);

        if (!Boolean.TRUE.equals(verified)) throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
    }

    public void clearVerified(String email) {
        redisTemplate.delete(DONE_KEY_PREFIX + email);
    }
}