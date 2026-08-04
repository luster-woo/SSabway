package com.ssafy.ssabway.domain.consultation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// 프론트에서 임시 보관한 상담 자막 한 문장
// 원문은 서버에 저장하지 않고 GMS 요청에만 사용
public record TranscriptItem(
   @NotBlank(message = "발화자 역할은 필수입니다.")
   @Pattern(
           regexp = "USER|STAFF",
           message = "발화자 역할은 USER 또는 STAFF만 가능합니다."
   )
   String speaker,

   @NotBlank(message = "자막 내용은 필수입니다.")
   @Size(
           max = 100,
           message = "자막 한 문장은 100자 이하여야 합니다."
   )
   String text
) {
}
