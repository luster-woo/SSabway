package com.ssafy.ssabway.global.s3;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Path;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;

@Component
@RequiredArgsConstructor
public class S3Uploader {

    private static final String BUCKET = "ssabway-uploaded-files";

    private final S3Client s3;

    /** 프론트에서 올라온 파일 업로드 (표지판 사진 등) */
    public String upload(String key, MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            s3.putObject(
                    b -> b.bucket(BUCKET).key(key).contentType(file.getContentType()),
                    RequestBody.fromInputStream(in, file.getSize())
            );
        } catch (IOException e) {
            throw new UncheckedIOException("S3 업로드 실패: " + key, e);
        }
        return key;
    }

    /** 서버 디스크에 있는 파일 업로드 (녹취 파일 등) */
    public String upload(String key, Path file) {
        s3.putObject(b -> b.bucket(BUCKET).key(key), RequestBody.fromFile(file));
        return key;
    }
}