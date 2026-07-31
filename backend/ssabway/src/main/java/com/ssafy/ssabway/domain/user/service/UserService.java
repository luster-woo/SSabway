package com.ssafy.ssabway.domain.user.service;

import com.ssafy.ssabway.domain.auth.service.RefreshTokenService;
import com.ssafy.ssabway.domain.user.dto.request.GoogleLoginRequest;
import com.ssafy.ssabway.domain.user.dto.request.LoginRequest;
import com.ssafy.ssabway.domain.user.dto.request.SignUpRequest;
import com.ssafy.ssabway.domain.user.dto.request.WithdrawRequest;
import com.ssafy.ssabway.domain.user.dto.response.EmailDuplicateResponse;
import com.ssafy.ssabway.domain.user.dto.response.LoginResult;
import com.ssafy.ssabway.domain.user.entity.Provider;
import com.ssafy.ssabway.domain.user.entity.User;
import com.ssafy.ssabway.domain.user.repository.UserRepository;
import com.ssafy.ssabway.domain.user.util.GoogleTokenVerifier;
import com.ssafy.ssabway.domain.user.util.GoogleUserInfo;
import com.ssafy.ssabway.global.common.Language;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import com.ssafy.ssabway.global.jwt.JwtProvider;
import com.ssafy.ssabway.global.jwt.TokenType;
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
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;
    private final GoogleTokenVerifier  googleTokenVerifier;

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

    public LoginResult login(LoginRequest request) {
        // 이메일 정규화
        String email = request.email().trim().toLowerCase();

        User user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOGIN_FAILED));

        // 소셜 가입자가 일반 로그인으로 시도하는 경우 차단
        if (user.getProvider() != Provider.LOCAL) throw new BusinessException(ErrorCode.SOCIAL_LOGIN_REQUIRED);

        // 혹시 모를 데이터 이상 방지
        if (user.getPasswordHash() == null) throw new BusinessException(ErrorCode.LOGIN_FAILED);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) throw new BusinessException(ErrorCode.LOGIN_FAILED);

        String accessToken = jwtProvider.createAccessToken(user.getId(), TokenType.USER);
        String refreshToken = jwtProvider.createRefreshToken(user.getId());

        refreshTokenService.save(user.getId(), refreshToken, jwtProvider.getRefreshTokenExpiration());

        return new LoginResult(accessToken, refreshToken, user.getLanguage());
    }

    @Transactional
    public void withdraw(Long userId, WithdrawRequest request) {

        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));


        // 소셜 가입자는 password_hash가 NULL이라 비밀번호로 본인 확인을 할 수 없음
        // 구글 로그인이 붙으면 별도 확인 수단이 필요!!!
        if (user.getPasswordHash() == null) throw new BusinessException(ErrorCode.SOCIAL_LOGIN_REQUIRED);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);

        user.withdraw();

        refreshTokenService.delete(userId);
    }

    @Transactional
    public LoginResult googleLogin(GoogleLoginRequest request) {
        GoogleUserInfo googleUser = googleTokenVerifier.verify(request.idToken());

        // providerId로 먼저 찾음. 이메일이 아니라 providerId가 소셜 계정의 식별자
        User user =  userRepository
                .findByProviderAndProviderIdAndDeletedAtIsNull(Provider.GOOGLE, googleUser.providerId())
                .orElseGet(() -> register(googleUser, request.language()));

        String accessToken = jwtProvider.createAccessToken(user.getId(), TokenType.USER);
        String refreshToken =  jwtProvider.createRefreshToken(user.getId());

        refreshTokenService.save(user.getId(), refreshToken, jwtProvider.getRefreshTokenExpiration());

        return new LoginResult(accessToken, refreshToken, user.getLanguage());
    }

    // 구글 계정으로 처음 로그인한 경우. 가입까지 진행
    private User register(GoogleUserInfo googleUser, Language language) {

        // 같은 이메일로 로컬 가입이 있으면 차단한다.
        if (userRepository.existsByEmail(googleUser.email())) {
            throw new BusinessException(ErrorCode.LOCAL_LOGIN_REQUIRED);
        }

        return userRepository.save(User.createGoogle(googleUser.email(), googleUser.providerId(), language));
    }
}
