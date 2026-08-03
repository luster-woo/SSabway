package com.ssafy.ssabway.domain.consultation.repository;

// 리포지토리가 서비스로 넘기는 조회 결과
// recordS3는 S3 객체 키라 그대로 프론트에 나가면 안 되고,
// 서비스가 presigned URL로 바꿔 ConsultationDetailResponse로 조립
public record ConsultationDetail(
        String email,
        String summary,
        String recordS3) {
}