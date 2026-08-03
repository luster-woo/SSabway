package com.ssafy.ssabway.domain.consultation.service;

import com.ssafy.ssabway.domain.consultation.dto.response.WaitingResponse;
import com.ssafy.ssabway.domain.consultation.entity.ConsultationStatus;
import com.ssafy.ssabway.domain.consultation.repository.ConsultationRepository;
import com.ssafy.ssabway.global.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConsultationService {

    private static final int PAGE_SIZE = 6;

    private final ConsultationRepository consultationRepository;

    public PageResponse<WaitingResponse> getWaitingList(Long staffId, int page) {

        Pageable pageable = PageRequest.of(page - 1, PAGE_SIZE);

        return PageResponse.from(
                    consultationRepository.findByStaffIdAndStatus(staffId, ConsultationStatus.WAITING, pageable)
        );
    }
}
