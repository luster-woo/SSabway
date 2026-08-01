package com.ssafy.ssabway.domain.staff.service;

import com.ssafy.ssabway.domain.auth.service.RefreshTokenService;
import com.ssafy.ssabway.domain.staff.dto.request.StaffLoginRequest;
import com.ssafy.ssabway.domain.staff.dto.response.StaffLoginResult;
import com.ssafy.ssabway.domain.staff.entity.Staff;
import com.ssafy.ssabway.domain.staff.repository.StaffRepository;
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
public class StaffService {

    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;

    public StaffLoginResult login(StaffLoginRequest request){

        String staffCode = request.staffCode().trim();

        Staff staff = staffRepository.findByStaffCode(staffCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOGIN_FAILED));

        if(!passwordEncoder.matches(request.password(), staff.getPasswordHash())) throw new BusinessException(ErrorCode.LOGIN_FAILED);

        String accessToken = jwtProvider.createAccessToken(staff.getId(), TokenType.STAFF);
        String refreshToken = jwtProvider.createRefreshToken(staff.getId(), TokenType.STAFF);

        refreshTokenService.save(TokenType.STAFF, staff.getId(), refreshToken, jwtProvider.getRefreshTokenExpiration());

        return new StaffLoginResult(accessToken, refreshToken, staff.getStaffCode());
    }
}
