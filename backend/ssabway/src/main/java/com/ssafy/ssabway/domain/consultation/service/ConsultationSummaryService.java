package com.ssafy.ssabway.domain.consultation.service;

import com.ssafy.ssabway.domain.consultation.client.GmsClient;
import com.ssafy.ssabway.domain.consultation.dto.request.ConsultationSummaryRequest;
import com.ssafy.ssabway.domain.consultation.dto.request.TranscriptItem;
import com.ssafy.ssabway.domain.consultation.dto.response.ConsultationSummaryResponse;
import com.ssafy.ssabway.domain.consultation.entity.Consultation;
import com.ssafy.ssabway.domain.consultation.entity.ConsultationStatus;
import com.ssafy.ssabway.domain.consultation.repository.ConsultationRepository;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConsultationSummaryService {


    // 자막 200개 × 문장당 100자를 기준으로 전체 길이를 제한
    // 지나치게 긴 프롬프트로 GMS 사용량과 응답 시간이 증가하는 것을 방지
    private static final int MAX_TRANSCRIPT_LENGTH = 20_000;

    private final ConsultationRepository consultationRepository;
    private final GmsClient gmsClient;

    // 종료된 상담의 임시 자막을 GMS로 요약하고, 자막 원문은 저장하지 않은 채 최종 요약만 DB에 저장

    @Transactional
    public ConsultationSummaryResponse summarizeConsultation(
            Long consultationId,
            Long requesterUserId,
            ConsultationSummaryRequest request
    ) {
        Consultation consultation = consultationRepository
                .findById(consultationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CONSULTATION_NOT_FOUND));

        // 다른 사용자의 상담 자막을 조회하거나 요약하지 못하도록 검증
        if (!consultation.getRequesterUserId()
                .equals(requesterUserId)) {

            throw new BusinessException(ErrorCode.CONSULTATION_ACCESS_DENIED);
        }

        // 녹음과 세션 종료가 완료된 상담만 요약 가능
        if (consultation.getStatus() != ConsultationStatus.ENDED) {

            throw new BusinessException(ErrorCode.CONSULTATION_NOT_ENDED);
        }

        /*
         * 프론트의 재시도나 중복 클릭으로 GMS가 여러 번 호출되지 않도록
         * 이미 생성된 요약이 있으면 기존 결과를 반환
         */
        if (consultation.getSummary() != null &&
                !consultation.getSummary().isBlank()) {

            return new ConsultationSummaryResponse(
                    consultationId,
                    consultation.getSummary()
            );
        }

        validateTotalLength(request);

        String transcriptPrompt = createTranscriptPrompt(request);

        String summary = gmsClient.summarize(transcriptPrompt);

        consultation.updateSummary(summary);

        return new ConsultationSummaryResponse(
                consultationId,
                summary
        );
    }

    // 전체 자막 길이를 계산해 과도한 GMS 요청을 차단
    private void validateTotalLength(
            ConsultationSummaryRequest request
    ) {
        long totalLength =
                request.transcripts()
                        .stream()
                        .mapToLong(transcript ->
                                transcript.text().length()
                        )
                        .sum();

        if (totalLength > MAX_TRANSCRIPT_LENGTH) {

            throw new BusinessException(ErrorCode.TRANSCRIPT_TOO_LARGE);
        }
    }

    // 발화자 역할을 한글로 구분해 GMS의 user 프롬프트를 생성
    private String createTranscriptPrompt(
            ConsultationSummaryRequest request
    ) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("다음은 지하철 이용자와 역무원의 상담 자막입니다.\n");

        prompt.append("아래 상담 자막만 근거로 요약하세요.\n\n");

        prompt.append("--- 상담 자막 시작 ---\n");

        for (TranscriptItem transcript : request.transcripts()) {

            String speaker =
                    switch (transcript.speaker()) {
                        case "USER" -> "사용자";
                        case "STAFF" -> "역무원";

                        /*
                         * DTO 검증을 통과하면 발생하지 않지만,
                         * Service 단에서도 허용된 역할만 처리
                         */
                        default -> throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
                    };

            prompt.append("[")
                    .append(speaker)
                    .append("] ")
                    .append(
                            transcript.text().trim()
                    )
                    .append("\n");
        }

        prompt.append("--- 상담 자막 끝 ---");

        return prompt.toString();
    }
}