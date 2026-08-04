package com.ssafy.ssabway.domain.consultation.client;

import com.ssafy.ssabway.domain.consultation.client.dto.GmsChatRequest;
import com.ssafy.ssabway.domain.consultation.client.dto.GmsChatResponse;
import com.ssafy.ssabway.domain.consultation.client.dto.GmsMessage;
import com.ssafy.ssabway.global.exception.BusinessException;
import com.ssafy.ssabway.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Component
public class GmsClient {

    private static final String DEVELOPER_PROMPT = """
        당신은 지하철 이용자와 역무원의 화상 상담 내용을
        민원 기록용으로 요약하는 AI입니다.

        다음 규칙을 반드시 지켜주세요.

        1. 상담의 핵심 문의와 역무원의 안내 결과를 한국어 한 문장으로 요약합니다.
        2. 결과는 100자 이내로 작성합니다.
        3. 인사말, 감탄사와 반복 표현은 제외합니다.
        4. 이메일, 전화번호 등 개인정보는 포함하지 않습니다.
        5. 제공되지 않은 내용을 추측하거나 추가하지 않습니다.
        6. 출발역, 도착역, 출구 번호와 이동 경로가 언급되면 핵심 내용에 포함합니다.
        7. 요약문만 반환하고 제목, 설명과 따옴표는 출력하지 않습니다.
        """;

    private final RestClient restClient;
    private final String chatPath;
    private final String apiKey;
    private final String model;

    public GmsClient(
            @Value("${gms.base-url}")
            String baseUrl,

            @Value("${gms.chat-path}")
            String chatPath,

            @Value("${gms.api-key}")
            String apiKey,

            @Value("${gms.model}")
            String model
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        this.chatPath = chatPath;
        this.apiKey = apiKey;
        this.model = model;
    }

    // 상담 자막 프롬프트를 GMS에 전달하고 생성된 요약문을 반환
    public String summarize(
            String transcriptPrompt
    ) {
        GmsChatRequest request = new GmsChatRequest(model,
                        List.of(new GmsMessage(
                                        "developer",
                                        DEVELOPER_PROMPT
                                ),
                                new GmsMessage(
                                        "user",
                                        transcriptPrompt
                                )
                        ),
                        false
                );

        try {
            GmsChatResponse response = restClient.post()
                            .uri(chatPath)
                            .header(
                                    "Authorization",
                                    "Bearer " + apiKey
                            )
                            .body(request)
                            .retrieve()
                            .body(GmsChatResponse.class);

            return extractSummary(response);

        } catch (RestClientException exception) {
            // 자막 원문이나 GMS 응답 전체가 서버 로그에 남지 않도록
            // 예외 메시지와 요청 본문을 직접 기록하지 않음
            throw new BusinessException(ErrorCode.GMS_REQUEST_FAILED);
        }
    }

    // GMS 응답의 첫 번째 선택지에서 요약문을 추출
    private String extractSummary(
            GmsChatResponse response
    ) {
        if (response == null || response.choices() == null || response.choices().isEmpty()) {

            throw new BusinessException(ErrorCode.GMS_INVALID_RESPONSE);
        }

        GmsChatResponse.Choice choice =
                response.choices().getFirst();

        if (choice == null ||
                choice.message() == null ||
                choice.message().content() == null ||
                choice.message().content().isBlank()) {

            throw new BusinessException(ErrorCode.GMS_INVALID_RESPONSE);
        }

        String summary = choice.message().content().trim();

        if (summary.length() > 255) {
            throw new BusinessException(ErrorCode.GMS_INVALID_RESPONSE);
        }

        return summary;
    }
}