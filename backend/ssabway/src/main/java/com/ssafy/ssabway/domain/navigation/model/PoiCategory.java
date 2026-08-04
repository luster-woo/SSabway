package com.ssafy.ssabway.domain.navigation.model;

import java.util.Set;

/*
    편의시설 종류와, 그 시설에서 할 수 있는 일

    "충전은 편의점과 매표소에서만 된다" 같은 규칙을 여기 한 곳에 모은다.
    분기 로직 여기저기에 시설 이름을 박아두면, 나중에 "발매기에서도 충전된다"가
    확인됐을 때 고칠 데를 찾아다녀야 한다.
 */
public enum PoiCategory {

    STORE(Set.of(Purpose.CHARGE, Purpose.BUY_CARD)),   // 편의점 — 구매와 충전을 한 곳에서
    TICKET_OFFICE(Set.of(Purpose.CHARGE)),             // 매표소 — 충전만
    TICKET_MACHINE(Set.of(Purpose.SINGLE_TICKET)),     // 발매기 — 1회권만
    ATM(Set.of(Purpose.WITHDRAW_CASH)),                // 현금 인출
    TOILET(Set.of());                                  // 화장실 — 결제 흐름과 무관

    private final Set<Purpose> supports;

    PoiCategory(Set<Purpose> supports) {
        this.supports = supports;
    }

    public boolean supports(Purpose purpose) {
        return supports.contains(purpose);
    }
}
