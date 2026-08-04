package com.ssafy.ssabway.domain.consultation.dto.response;

import com.ssafy.ssabway.global.common.Language;

/*
    상담방에서 쓰는 사용자 정보 단건.

    WaitingResponse 와 같은 내용이지만 대기열이 아니라 진행 중인 상담을
    consultationId 로 바로 조회한다. 역무원이 수락한 뒤에는 대기 목록에서
    사라지므로 거기서 가져올 수 없다.

    language 가 특히 중요하다 — 실시간 번역 자막이 사용자 언어를 알아야
    시작된다. 이 값이 없으면 프론트가 자막을 아예 켜지 않는다
    (VideoStage.tsx 의 enabled 인자).

    ⚠️ 녹취 조회용 GET /staffs/consultations?id= (ConsultationDetailResponse)
       와 다른 API 다. 그쪽은 종료된 상담의 요약·녹취를 준다.
 */
public record ConsultationInfoResponse(

        Long consultationId,
        String email,
        String departure,
        String destination,
        Language language
) {
}
