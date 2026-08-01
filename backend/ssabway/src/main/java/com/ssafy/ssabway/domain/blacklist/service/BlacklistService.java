package com.ssafy.ssabway.domain.blacklist.service;

import com.ssafy.ssabway.domain.blacklist.dto.request.BlacklistRegisterRequest;
import com.ssafy.ssabway.domain.blacklist.entity.Blacklist;
import com.ssafy.ssabway.domain.blacklist.repository.BlacklistRepository;
import com.ssafy.ssabway.domain.user.entity.User;
import com.ssafy.ssabway.domain.user.repository.UserRepository;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BlacklistService {

    private final BlacklistRepository blacklistRepository;
    private final UserRepository userRepository;

    @Transactional
    public void register(Long staffId, BlacklistRegisterRequest request) {

        String email = request.userEmail().trim().toLowerCase();

        User user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (blacklistRepository.existsByUserIdAndReleasedAtIsNull(user.getId())) throw new BusinessException(ErrorCode.BLACKLIST_DUPLICATED);

        blacklistRepository.save(Blacklist.register(user.getId(), staffId, request.reasons()));
    }
}
