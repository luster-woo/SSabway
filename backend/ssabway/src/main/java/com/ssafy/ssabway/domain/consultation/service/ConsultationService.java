package com.ssafy.ssabway.domain.consultation.service;

import com.ssafy.ssabway.domain.blacklist.repository.BlacklistRepository;
import com.ssafy.ssabway.domain.consultation.dto.request.ConsultationCreateRequest;
import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationCreateResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationDetailResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.HistoryResponse;
import com.ssafy.ssabway.domain.consultation.dto.response.WaitingResponse;
import com.ssafy.ssabway.domain.consultation.entity.Consultation;
import com.ssafy.ssabway.domain.consultation.entity.ConsultationStatus;
import com.ssafy.ssabway.domain.consultation.repository.ConsultationDetail;
import com.ssafy.ssabway.domain.consultation.repository.ConsultationRepository;
import com.ssafy.ssabway.domain.staff.entity.Staff;
import com.ssafy.ssabway.domain.staff.repository.StaffRepository;
import com.ssafy.ssabway.domain.user.repository.UserRepository;
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
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConsultationService {

    private static final int PAGE_SIZE = 6;
    private static final Duration RECORD_URL_DURATION = Duration.ofMinutes(10);
    // 해당 상태의 상담이 존재하면 동일 사용자의 새 요청을 차단합니다.
    private static final Set<ConsultationStatus> ACTIVE_STATUSES = Set.of(
            ConsultationStatus.WAITING,
            ConsultationStatus.MATCHED,
            ConsultationStatus.IN_PROGRESS
    );

    private final ConsultationRepository consultationRepository;
    private final S3Manager s3Manager;
    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final BlacklistRepository blacklistRepository;

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


    /*
    로그인 사용자의 상담 요청을 출발역 담당 역무원의 대기열에 등록한다.
    사용자와 담당 역무원을 확인하고 블랙리스트 및 중복 상담을 검증한 뒤,
    WAITING 상태의 상담 정보와 최초 대기 순번을 반환한다.
    */
    @Transactional
    public ConsultationCreateResponse requestConsultation(
            Long requesterUserId,
            ConsultationCreateRequest request) {

        userRepository.findByIdAndDeletedAtIsNull(requesterUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Staff staff = staffRepository
                .findByDepartureStationName(request.departure().trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.STAFF_NOT_FOUND)
                );

        Long staffId = staff.getId();

        if (blacklistRepository.existsByUserIdAndStaffIdAndReleasedAtIsNull(
                requesterUserId, staffId)) {
            throw new BusinessException(ErrorCode.CONSULTATION_BLOCKED);
        }

        if (consultationRepository.existsByRequesterUserIdAndStatusIn(
                requesterUserId, ACTIVE_STATUSES)) {
            throw new BusinessException(ErrorCode.CONSULTATION_DUPLICATED);
        }

        Consultation consultation = Consultation.createWaiting(
                requesterUserId,
                staffId,
                request.departure(),
                request.destination()
        );

        Consultation saved = consultationRepository.save(consultation);

        long queuePosition = consultationRepository.countByStaffIdAndStatus(
                staffId,
                ConsultationStatus.WAITING
        );

        return new ConsultationCreateResponse(
                saved.getId(),
                saved.getStatus(),
                queuePosition,
                null,
                saved.getRequestedAt(),
                null
        );
    }
}
