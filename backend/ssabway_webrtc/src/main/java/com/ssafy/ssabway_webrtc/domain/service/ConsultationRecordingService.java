package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import com.ssafy.ssabway_webrtc.domain.repository.ConsultationRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultationRecordingService {
    private static final String SESSION_PREFIX = "consultation-";
    
    private final ConsultationRepository consultationRepository;
    
    @Transactional
    public void saveRecordS3(String sessionId, String s3ObjectKey){

        // OpenVidu 세션 ID에서 DB 조회에 사용할 상담 ID 추출
        Long consultationId = extractConsultationId(sessionId);

        // S3 객체 키가 비어 있는 상담에만 저장
        int updatedCount = consultationRepository.updateRecordS3(
            consultationId,
            s3ObjectKey
        );

        if(updatedCount == 1){
            log.info(
                "상담 녹음 S3 경로 저장 완료 - consultationId={}, objectKey={}",
                consultationId,
                s3ObjectKey
            );
            return;
        }

        if(!consultationRepository.existsById(consultationId)){
            throw new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND);
        }

        // 동일한 웹훅이 중복 수신되면 기존 값을 유지
        log.info(
            "상담 녹음 S3 경로가 이미 저장되어 있습니다. consultationId={}",
            consultationId
        );
    }

    private Long extractConsultationId(String sessionId) {
        if(sessionId == null || !sessionId.startsWith(SESSION_PREFIX)){
            throw new BusinessException(ErrorCode.INVALID_SESSION_ID);
        }

        try{
            return Long.parseLong(
                sessionId.substring(SESSION_PREFIX.length())
            );
        } catch (NumberFormatException exception){
            throw new BusinessException(
                ErrorCode.INVALID_SESSION_ID,
                exception
            );
        }
    }
}
