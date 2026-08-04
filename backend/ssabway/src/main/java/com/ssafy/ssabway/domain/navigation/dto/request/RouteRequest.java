package com.ssafy.ssabway.domain.navigation.dto.request;

import com.ssafy.ssabway.domain.navigation.model.Purpose;
import com.ssafy.ssabway.global.common.Language;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/*
    역 내 경로 요청

    startPoint  표지판 인식 모델이 내놓은 노드 id (예: S3_02)
    finalPoint  오딧세이에서 정해진 개찰구 (예: GA0_01)

    needs 와 hasCash 는 readyToGo 가 false 일 때만 의미가 있다.
    true 면 바로 개찰구로 안내하므로 무시된다.
 */
public record RouteRequest(

        @NotBlank(message = "출발 위치는 필수입니다.")
        String startPoint,

        @NotBlank(message = "도착 위치는 필수입니다.")
        String finalPoint,

        @NotNull(message = "교통카드 준비 여부는 필수입니다.")
        Boolean readyToGo,

        Purpose needs,        // CHARGE / BUY_CARD / SINGLE_TICKET
        Boolean hasCash,
        Boolean avoidStairs,  // 계단·에스컬레이터 회피

        @NotNull(message = "언어 코드는 필수입니다.")
        Language langCode
) {

    public boolean isReadyToGo() {
        return Boolean.TRUE.equals(readyToGo);
    }

    public boolean hasCashOrDefault() {
        return Boolean.TRUE.equals(hasCash);
    }

    public boolean avoidStairsOrDefault() {
        return Boolean.TRUE.equals(avoidStairs);
    }

    /*
        경유 목적. 바로 탑승이면 null 이다.

        WITHDRAW_CASH 와 TO_GATE 는 서버가 붙이는 값이라 요청으로 받으면 안 된다.
        받으면 "현금 뽑으러 가는 게 목적"인 이상한 경로가 만들어진다.
     */
    public Purpose effectiveNeeds() {
        if (isReadyToGo()) {
            return null;
        }
        return needs;
    }

    public boolean hasValidNeeds() {
        return isReadyToGo()
                || needs == Purpose.CHARGE
                || needs == Purpose.BUY_CARD
                || needs == Purpose.SINGLE_TICKET;
    }
}
