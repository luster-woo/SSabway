package com.ssafy.ssabway.domain.consultation.dto.response;

// recordUrl은 DB 값이 아니라 서비스에서 발급한 presigned URL이라
// JPQL 생성자 표현식으로 만들 수 없다. 조회 결과를 받은 뒤 서비스가 조립한다
public record ConsultationDetailResponse (
        String email,
        String summary,
        String recordUrl,
        Long expiresIn){
}
