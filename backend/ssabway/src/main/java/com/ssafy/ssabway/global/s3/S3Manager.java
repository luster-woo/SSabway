package com.ssafy.ssabway.global.s3;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

/*
    S3 객체를 다루는 빈
    버킷 이름을 이 클래스만 알고 있으므로 S3에 접근하는 코드는 전부 여기를 거친다.

    S3Client : 업로드/삭제
    S3Presigner : 서명된 임시 URL 발급

 */
@Component
public class S3Manager {

    private final S3Client s3;
    private final S3Presigner presigner;
    private final String bucket;

    public S3Manager(S3Client s3, S3Presigner presigner, @Value("${aws.s3.bucket}") String bucket) {
        this.s3 = s3;
        this.presigner = presigner;
        this.bucket = bucket;
    }

    /*
        프론트에서 올라온 파일 업로드 (표지판 사진 등)

        contentType을 지정하지 않으면 S3가 application/octet-stream으로 저장해
        브라우저가 이미지로 인식하지 못하고 다운로드해버린다.
        MultipartFile이 타입을 못 준 경우에만 기본값을 쓴다.
     */
    public String upload(String key, MultipartFile file) {
        String contentType = file.getContentType() != null
                ? file.getContentType()
                : "application/octet-stream";

        // try-with-resources: 업로드 도중 예외가 나도 스트림이 닫힌다
        try (InputStream in = file.getInputStream()) {
            s3.putObject(
                    b -> b.bucket(bucket).key(key).contentType(contentType),
                    // 스트림은 길이를 미리 알려줘야 한다. S3가 Content-Length를 요구하기 때문
                    RequestBody.fromInputStream(in, file.getSize())
            );
        } catch (IOException e) {
            // IOException은 체크 예외라 호출부마다 try가 생긴다.
            // 복구할 방법이 없는 실패이므로 언체크로 감싸 GlobalExceptionHandler까지 보낸다
            throw new UncheckedIOException("S3 업로드 실패: " + key, e);
        }
        return key;
    }

    /*
        서버 디스크에 있는 파일 업로드 (녹취 파일 등)
        RequestBody.fromFile은 길이를 파일에서 직접 읽으므로 size를 넘길 필요가 없다.
     */
    public String upload(String key, Path file) {
        s3.putObject(b -> b.bucket(bucket).key(key), RequestBody.fromFile(file));
        return key;
    }

    /*
        없는 키를 지워도 예외가 나지 않는다 (S3의 삭제는 멱등).
        "지워졌는지" 확인이 필요하면 별도로 조회해야 한다.
     */
    public void delete(String key) {
        s3.deleteObject(b -> b.bucket(bucket).key(key));
    }

    /*
        비공개 버킷의 객체를 일정 시간만 열람할 수 있는 서명된 URL 생성

        서명과 만료 시각이 박힌 URL을 내려주면 버킷은 비공개로 두면서
        프론트가 <audio src="..."> 로 바로 재생할 수 있다.
     */
    public String createPresignedUrl(String key, Duration duration) {
        GetObjectPresignRequest request = GetObjectPresignRequest.builder()
                .signatureDuration(duration)
                .getObjectRequest(b -> b.bucket(bucket).key(key))
                .build();

        return presigner.presignGetObject(request).url().toString();
    }
}