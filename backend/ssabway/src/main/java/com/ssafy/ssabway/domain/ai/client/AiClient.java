package com.ssafy.ssabway.domain.ai.client;

import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/*
    표지판 인식 AI 서버(FastAPI) 호출 담당.

    앱 ──image──> ssabway(8080) ──file──> ai(8000)

    PyTorch 가 파이썬 라이브러리라 자바에서 직접 쓸 수 없어 서버를 분리했다.
    AI 컨테이너는 도커 네트워크 안에서만 접근하며 외부에 포트를 열지 않는다.
 */
@Slf4j
@Component
public class AiClient {

    private static final String PREDICT_PATH = "/predict";

    // 프론트는 image, FastAPI 는 file 로 받는다. 여기서 이름을 바꿔 준다.
    private static final String AI_FILE_PART = "file";

    private final RestClient aiRestClient;

    public AiClient(@Qualifier("aiRestClient") RestClient aiRestClient) {
        this.aiRestClient = aiRestClient;
    }

    public SignPredictResult predictSign(MultipartFile image) {

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add(AI_FILE_PART, toPart(image));

        try {
            SignPredictResult result = aiRestClient.post()
                    .uri(PREDICT_PATH)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(SignPredictResult.class);

            if (result == null) {
                log.warn("AI 서버가 빈 응답을 보냈습니다.");
                throw new BusinessException(ErrorCode.AI_SERVER_ERROR);
            }

            return result;

        } catch (HttpClientErrorException exception) {
            /*
                AI 가 4xx 를 낸 것은 우리가 보낸 사진이 잘못됐다는 뜻이다.
                (읽을 수 없는 파일 400, 지원하지 않는 형식 415, 크기 초과 413)
                서버 장애로 뭉뚱그리면 사용자가 "다시 찍어보세요" 대신
                "잠시 후 시도하세요" 를 보게 되어 영영 넘어가지 못한다.
             */
            log.warn("AI 가 사진을 거부했습니다: {} - {}",
                    exception.getStatusCode(), exception.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_IMAGE_INVALID);

        } catch (RestClientException exception) {
            /*
                타임아웃·연결 실패·5xx 가 여기로 온다.
                가장 흔한 원인은 모델 로딩 중(503)과 컨테이너 미기동(연결 거부)이다.
                둘 다 사용자가 할 수 있는 일은 "다시 찍기" 뿐이라 구분하지 않는다.
             */
            log.error("AI 서버 호출 실패: {}", ErrorCode.AI_SERVER_ERROR.name(), exception);
            throw new BusinessException(ErrorCode.AI_SERVER_ERROR);
        }
    }

    /*
        MultipartFile 을 그대로 넘기면 파일명이 빠져 FastAPI 가 415 를 낸다.
        UploadFile.content_type 판별이 파일명 확장자에 기대기 때문에
        getFilename() 을 반드시 채운 리소스로 감싼다.
     */
    private ByteArrayResource toPart(MultipartFile image) {
        byte[] bytes;
        try {
            bytes = image.getBytes();
        } catch (IOException exception) {
            log.warn("업로드 파일을 읽지 못했습니다.", exception);
            throw new BusinessException(ErrorCode.AI_IMAGE_INVALID);
        }

        String filename = image.getOriginalFilename() == null
                ? "sign.jpg"
                : image.getOriginalFilename();

        return new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }
}
