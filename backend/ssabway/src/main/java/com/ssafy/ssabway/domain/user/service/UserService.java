package com.ssafy.ssabway.domain.user.service;

import com.ssafy.ssabway.domain.user.dto.response.EmailDuplicateResponse;
import com.ssafy.ssabway.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public EmailDuplicateResponse checkEmailDuplicate (String email) {
        boolean isDuplicate = userRepository.existsByEmail(email);
        return new EmailDuplicateResponse(isDuplicate);
    }
}
