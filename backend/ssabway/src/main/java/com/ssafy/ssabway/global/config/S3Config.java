package com.ssafy.ssabway.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {

    @Bean
    public S3Client s3Client(
            @Value("${aws.region}") String region,
            @Value("${aws.access-key}") String accessKey,
            @Value("${aws.secret-key}") String secretKey) {

        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    /*
        presigned URL 발급 전용 빈
        S3Client : 실제 파일 업로드/다운로드
        S3Presigner : "이 파일을 N분간 열람 허용"이라는 서명된 임시 URL 생성

        상담 녹취는 민원인 음성이라 버킷을 공개할 수 없다.
        그렇다고 비공개 버킷의 객체 주소를 그대로 주면 브라우저에서 403이 난다.
        서명과 만료 시각이 박힌 URL을 내려주면 버킷은 비공개로 두면서
        프론트가 <audio src="..."> 로 바로 재생 가능
     */
    @Bean
    public S3Presigner s3Presigner(
            @Value("${aws.region}") String region,
            @Value("${aws.access-key}") String accessKey,
            @Value("${aws.secret-key}") String secretKey) {

        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }
}