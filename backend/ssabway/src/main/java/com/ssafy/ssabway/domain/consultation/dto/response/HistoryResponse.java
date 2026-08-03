package com.ssafy.ssabway.domain.consultation.dto.response;

import java.time.LocalDateTime;

// blacklisted는 컬럼이 아니라 LEFT JOIN 결과로 계산된 값
// 프론트가 이 값으로 [블랙리스트 등록] / [차단됨·해제] 버튼을 분기
public record HistoryResponse(
        Long consultationId,
        String email,
        String summary,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        boolean blacklisted
) {}