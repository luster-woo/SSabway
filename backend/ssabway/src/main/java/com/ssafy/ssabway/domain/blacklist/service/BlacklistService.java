package com.ssafy.ssabway.domain.blacklist.service;

import com.ssafy.ssabway.domain.blacklist.dto.request.BlacklistRegisterRequest;
import com.ssafy.ssabway.domain.blacklist.dto.request.BlacklistReleaseRequest;
import com.ssafy.ssabway.domain.blacklist.dto.response.BlacklistResponse;
import com.ssafy.ssabway.domain.blacklist.entity.Blacklist;
import com.ssafy.ssabway.domain.blacklist.repository.BlacklistRepository;
import com.ssafy.ssabway.domain.user.entity.User;
import com.ssafy.ssabway.domain.user.repository.UserRepository;
import com.ssafy.ssabway.global.common.PageResponse;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BlacklistService {

    private final BlacklistRepository blacklistRepository;
    private final UserRepository userRepository;

    // 페이지 당 5개를 가져옴
    private static final int PAGE_SIZE = 5;

    @Transactional
    public void register(Long staffId, BlacklistRegisterRequest request) {

        String email = request.userEmail().trim().toLowerCase();

        User user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (blacklistRepository.existsByUserIdAndStaffIdAndReleasedAtIsNull(user.getId(), staffId)) throw new BusinessException(ErrorCode.BLACKLIST_DUPLICATED);

        blacklistRepository.save(Blacklist.register(user.getId(), staffId, request.reasons()));
    }

    public PageResponse<BlacklistResponse> getBlacklist(Long staffId, int page) {
        Pageable pageable = PageRequest.of(page - 1, PAGE_SIZE);

        // 역 1개당 계정 1개 전제라 등록자 기준 필터가 곧 역 기준 필터
        return PageResponse.from(blacklistRepository.findActiveByStaffId(staffId, pageable));
    }

    @Transactional
    public void release(Long staffId, BlacklistReleaseRequest request){

        String email = request.userEmail().trim().toLowerCase();

        User user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // staffId 조건이 없으면 다른 역의 차단 기록을 해제하게 됨
        Blacklist blacklist = blacklistRepository.findByUserIdAndStaffIdAndReleasedAtIsNull(user.getId(), staffId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BLACKLIST_NOT_FOUND));

        // 변경 감지가 UPDATE 자동 수행
        blacklist.release();
    }
}
