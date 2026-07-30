package com.ssafy.ssabway_webrtc.domain.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class S3Config {
    /**
     * 백엔드가 S3에 접근할 때 사용하는 AWS 클라이언트를 생성합니다.
     * 실제 인증 정보는 Git에 포함되지 않는 application-secret.yaml에서 가져옵니다.
     */
    @Bean
    public S3Client s3Client(@Value("${cloud.aws.region}") String region,
                             @Value("${cloud.aws.credentials.access-key}") String accessKey,
                             @Value("${cloud.aws.credentials.secret-key}") String secretKey
    ){
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        return S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(
                StaticCredentialsProvider.create(credentials)
            )
            .build();
    }
}
