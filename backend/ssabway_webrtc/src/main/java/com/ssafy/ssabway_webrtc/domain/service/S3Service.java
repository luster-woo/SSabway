package com.ssafy.ssabway_webrtc.domain.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.nio.file.Path;

@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    /**
     * 서버에 저장된 녹음 파일을 지정된 S3 객체 키로 업로드합니다.
     *
     * 파일 전체를 byte 배열로 메모리에 올리지 않고 Path를 전달해
     * 상담 녹음 파일의 크기가 커져도 메모리 사용량을 줄입니다.
     *
     * @param filePath 서버에 임시 저장된 녹음 파일 경로
     * @param objectKey S3에 저장할 객체 키
     * @param contentType 파일의 Content-Type
     * @return DB에 저장할 S3 객체 키
     */

    public String upload(
        Path filePath,
        String objectKey,
        String contentType
    ){
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(objectKey)
            .contentType(contentType)
            .build();

        try{
            s3Client.putObject(request, RequestBody.fromFile(filePath));

            return objectKey;
        } catch (S3Exception exception){
            throw new IllegalStateException(
                "녹음 파일을 S3에 업로드 할 수 없음",exception
            );
        }
    }

}
