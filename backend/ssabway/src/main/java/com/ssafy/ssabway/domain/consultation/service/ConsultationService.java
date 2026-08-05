package com.ssafy.ssabway.domain.consultation.service;

import com.ssafy.ssabway.domain.blacklist.repository.BlacklistRepository;
import com.ssafy.ssabway.domain.consultation.client.WebRtcClient;
import com.ssafy.ssabway.domain.consultation.client.WebRtcConnectionResponse;
import com.ssafy.ssabway.domain.consultation.dto.request.ConsultationCreateRequest;
import com.ssafy.ssabway.domain.consultation.dto.response.*;
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
    private final WebRtcClient webRtcClient;

    public PageResponse<WaitingResponse> getWaitingList(Long staffId, int page) {

        Pageable pageable = PageRequest.of(page - 1, PAGE_SIZE);

        return PageResponse.from(
                    consultationRepository.findByStaffIdAndStatus(staffId, ConsultationStatus.WAITING, pageable)
        );
    }

    /*
        상담방에서 쓰는 사용자 정보 단건.

        수락하면 대기 목록에서 사라져 거기서 가져올 수 없다. 특히 language 가
        없으면 프론트가 실시간 번역 자막을 아예 시작하지 않는다
        (VideoStage.tsx 의 enabled 인자).
     */
    public ConsultationInfoResponse getInfo(Long staffId, Long consultationId) {

        return consultationRepository.findInfoByIdAndStaffId(consultationId, staffId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));
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
                .findByStationId(request.departureStationId())
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


    @Transactional(rollbackFor = Exception.class)
    public ConsultationAcceptResponse acceptConsultation(
            Long consultationId,
            Long staffId
    ) {
        Consultation consultation = consultationRepository.findById(consultationId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        // 로그인한 역무원에게 배정된 상담인지 확인
        if (!consultation.getStaffId().equals(staffId)) {
            throw new BusinessException(ErrorCode.CONSULTATION_ACCESS_DENIED);
        }

        // 이미 취소·수락·진행·종료된 상담은 다시 수락할 수 없음
        if (consultation.getStatus() != ConsultationStatus.WAITING) {
            throw new BusinessException(ErrorCode.CONSULTATION_ALREADY_ACCEPTED);
        }

        /*
         * WAITING인 경우에만 MATCHED로 변경
         * 동시에 여러 수락 요청이 들어와도 한 요청만 성공
         */
        int updatedCount = consultationRepository.acceptConsultation(
                        staffId,
                        consultationId,
                        ConsultationStatus.WAITING,
                        ConsultationStatus.MATCHED
                );

        if (updatedCount == 0) {
            throw new BusinessException(ErrorCode.CONSULTATION_ALREADY_ACCEPTED);
        }

        /*
         * WebRTC 서버에 OpenVidu 세션과 STAFF 연결 토큰 생성을 요청
         * 호출에 실패하면 예외가 발생하면서 위 상태 변경도 롤백
         */
        WebRtcConnectionResponse connection = webRtcClient.createStaffConnection(
                        consultationId,
                        staffId
                );

        return new ConsultationAcceptResponse(
                consultationId,
                connection.sessionId(),
                connection.token(),
                ConsultationStatus.MATCHED
        );
    }
}
