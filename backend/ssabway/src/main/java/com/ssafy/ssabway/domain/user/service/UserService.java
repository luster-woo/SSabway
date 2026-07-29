package com.ssafy.ssabway.domain.user.service;

import com.ssafy.ssabway.domain.user.dto.request.SignUpRequest;
import com.ssafy.ssabway.domain.user.dto.response.EmailDuplicateResponse;
import com.ssafy.ssabway.domain.user.entity.User;
import com.ssafy.ssabway.domain.user.repository.UserRepository;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final EmailVerificationService emailVerificationService;
    private final PasswordEncoder passwordEncoder;

    public EmailDuplicateResponse checkEmailDuplicate (String email) {
        boolean isDuplicate = userRepository.existsByEmail(email);
        return new EmailDuplicateResponse(isDuplicate);
    }

    @Transactional
    public void signup(SignUpRequest request) {
        String email = request.email().trim().toLowerCase();

        // 이메일 인증이 완료 되었는지 확인
        emailVerificationService.validateVerified(email);

        // 다른 요청이 같은 이메일로 먼저 시도할 수 있으므로 방지
        if  (userRepository.existsByEmail(email)) throw new BusinessException(ErrorCode.EMAIL_DUPLICATED);

        // DelegatingPasswordEncoder : {bcrypt}$2a$... 형태로 저장
        String passwordHash = passwordEncoder.encode(request.password());

        userRepository.save(User.createLocal(email, passwordHash, request.language()));

        emailVerificationService.clearVerified(email);
    }
}
