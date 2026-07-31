package com.ssafy.ssabway_webrtc.domain.service;

import com.ssafy.ssabway_webrtc.common.exception.BusinessException;
import com.ssafy.ssabway_webrtc.common.exception.ErrorCode;
import io.openvidu.java.client.Recording;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Base64;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class RecordingStorageService {

    private static final String SESSION_PREFIX = "consultation-";
    private static final String AUDIO_CONTENT_TYPE = "audio/webm";

    private final S3Service s3Service;
    private final String openViduSecret;
    private final HttpClient httpClient;

    public RecordingStorageService(
        S3Service s3Service,
        @Value("${openvidu.secret}") String openViduSecret
    ) {
        this.s3Service = s3Service;
        this.openViduSecret = openViduSecret;

        // OpenVidu 녹음 파일 다운로드 중 리다이렉트가 발생해도 사용할 HTTP 클라이언트 설정
        this.httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    /**
     * 처리가 완료된 OpenVidu 녹음 파일을 내려받아 S3에 업로드합니다.
     *
     * 다운로드 파일은 임시 경로에 저장하며,
     * S3 업로드 성공 여부와 관계없이 마지막에 삭제합니다.
     *
     * @param recording ready 상태의 OpenVidu 녹화 정보
     * @return DB에 저장할 S3 객체 키
     */
    public String uploadRecording(Recording recording) {
        validateRecording(recording);

        Path temporaryFile = null;

        try {
            // OpenVidu에서 WEBM 음성 파일 다운로드
            temporaryFile = downloadRecording(recording);

            // consultation-{상담 ID} 형식의 세션 ID에서 상담 ID 추출
            Long consultationId =
                extractConsultationId(recording.getSessionId());

            // 상담 ID와 녹화 ID로 S3 객체 키 생성
            String objectKey = createObjectKey(
                consultationId,
                recording.getId()
            );

            // 임시 음성 파일을 S3에 업로드하고 객체 키 반환
            return s3Service.upload(
                temporaryFile,
                objectKey,
                AUDIO_CONTENT_TYPE
            );

        } finally {
            // 성공 여부와 관계없이 서버 임시 파일 삭제
            deleteTemporaryFile(temporaryFile);
        }
    }

    /**
     * OpenVidu의 녹음 파일 URL은 서버 인증이 필요하므로
     * OpenVidu Secret을 Basic 인증 Header에 포함해 요청합니다.
     */
    private Path downloadRecording(Recording recording) {
        String credentials = Base64.getEncoder()
            .encodeToString(
                ("OPENVIDUAPP:" + openViduSecret)
                    .getBytes(StandardCharsets.UTF_8)
            );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(recording.getUrl()))
            .header("Authorization", "Basic " + credentials)
            .timeout(Duration.ofMinutes(5))
            .GET()
            .build();

        Path temporaryFile = null;

        try {
            HttpResponse<InputStream> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofInputStream()
            );
            // HTTP 200번대 응답이 아니면 다운로드 실패 처리
            if (response.statusCode() < 200 ||
                response.statusCode() >= 300) {

                response.body().close();

                throw new BusinessException(ErrorCode.RECORDING_DOWNLOAD_FAILED);
            }


            temporaryFile = Files.createTempFile("openvidu-recording-", ".webm");

            // 응답 스트림을 WEBM 임시 파일로 저장
            try (InputStream inputStream = response.body()) {
                Files.copy(
                    inputStream,
                    temporaryFile,
                    StandardCopyOption.REPLACE_EXISTING
                );
            }

            return temporaryFile;

        } catch (InterruptedException exception) {
            // 중단 신호를 복구해 상위 실행 흐름이 중단 상태를 인식하게 합니다.
            Thread.currentThread().interrupt();

            throw new BusinessException(
                ErrorCode.RECORDING_DOWNLOAD_FAILED,
                exception
            );

        } catch (IOException exception) {
            // 파일 복사 중 실패한 경우 생성된 임시 파일을 즉시 정리
            deleteTemporaryFile(temporaryFile);
            throw new BusinessException(
                ErrorCode.RECORDING_DOWNLOAD_FAILED,
                exception
            );
        }
    }

    /**
     * S3 업로드는 최종 파일이 준비된 ready 상태에서만 수행합니다.
     */
    private void validateRecording(Recording recording) {
        if (recording == null) {
            throw new BusinessException(ErrorCode.RECORDING_NOT_FOUND);
        }

        if (recording.getStatus() != Recording.Status.ready) {
            throw new BusinessException(ErrorCode.RECORDING_STATUS_INVALID);
        }

        if (recording.getUrl() == null ||
            recording.getUrl().isBlank()) {

            throw new BusinessException(ErrorCode.RECORDING_DOWNLOAD_FAILED);
        }
    }

    /**
     * consultation-{상담 ID} 형식의 세션 ID에서 상담 ID를 추출합니다.
     */
    private Long extractConsultationId(String sessionId) {
        if (sessionId == null ||
            !sessionId.startsWith(SESSION_PREFIX)) {

            throw new BusinessException(ErrorCode.INVALID_SESSION_ID);
        }

        try {
            return Long.parseLong(
                sessionId.substring(SESSION_PREFIX.length())
            );
        } catch (NumberFormatException exception) {
            throw new BusinessException(
                ErrorCode.INVALID_SESSION_ID,
                exception
            );
        }
    }

    /**
     * 상담 ID와 녹화 ID를 사용해 중복되지 않는 S3 저장 경로를 생성합니다.
     */
    private String createObjectKey(
        Long consultationId,
        String recordingId
    ) {
        return "recordings/consultations/%d/%s.webm"
            .formatted(consultationId, recordingId);
    }

    /**
     * 업로드 성공 여부와 관계없이 서버의 임시 파일을 정리합니다.
     */
    private void deleteTemporaryFile(Path temporaryFile) {
        if (temporaryFile == null) {
            return;
        }

        try {
            Files.deleteIfExists(temporaryFile);
        } catch (IOException exception) {
            // 임시 파일 삭제 실패가 업로드 결과를 덮어쓰지 않도록 로그만 남깁니다.
            log.warn(
                "임시 녹음 파일을 삭제하지 못했습니다. path={}",
                temporaryFile,
                exception
            );
        }
    }
}
