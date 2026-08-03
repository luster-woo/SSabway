package com.ssafy.ssabway.domain.consultation.service;

import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationDetailResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.HistoryResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.WaitingResponse;
import com.ssafy.ssabway.domain.consultation.entity.ConsultationStatus;
import com.ssafy.ssabway.domain.consultation.repository.ConsultationDetail;
import com.ssafy.ssabway.domain.consultation.repository.ConsultationRepository;
import com.ssafy.ssabway.global.common.PageResponse;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import com.ssafy.ssabway.global.s3.S3Manager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConsultationService {

    private static final int PAGE_SIZE = 6;
    private static final Duration RECORD_URL_DURATION = Duration.ofMinutes(10);

    private final ConsultationRepository consultationRepository;
    private final S3Manager s3Manager;

    public PageResponse<WaitingResponse> getWaitingList(Long staffId, int page) {

        Pageable pageable = PageRequest.of(page - 1, PAGE_SIZE);

        return PageResponse.from(
                    consultationRepository.findByStaffIdAndStatus(staffId, ConsultationStatus.WAITING, pageable)
        );
    }

    public ConsultationDetailResponse getDetail(Long staffId, Long consultationId) {

        ConsultationDetail detail = consultationRepository.findDetailByIdAndStaffId(consultationId, staffId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        // 녹취가 아직 없거나 업로드에 실패한 상담이 있다. 이때는 URL 없이 내려보내
        // 프론트가 요약만 띄우고 플레이어를 비활성화하도록 한다
        String recordUrl = detail.recordS3() == null ? null : s3Manager.createPresignedUrl(detail.recordS3(), RECORD_URL_DURATION);

        return new ConsultationDetailResponse(
                detail.email(),
                detail.summary(),
                recordUrl,
                recordUrl == null ? null : RECORD_URL_DURATION.toSeconds());
    }

    public PageResponse<HistoryResponse> getHistory(Long staffId, int page) {
        Pageable pageable = PageRequest.of(page - 1, PAGE_SIZE);

        return PageResponse.from(
                consultationRepository.findHistoryByStaffIdAndStatus(
                        staffId, ConsultationStatus.ENDED, pageable)
        );
    }
}
