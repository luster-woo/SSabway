package com.ssafy.ssabway.domain.navigation.model;

/*
    개찰 전에 들러야 하는 이유

    요청의 needs(CHARGE / BUY_CARD / SINGLE_TICKET)와 같은 값을 쓰고,
    현금이 없을 때 앞에 붙는 WITHDRAW_CASH 가 하나 더 있다.
    TO_GATE 는 경유가 끝나고 개찰구로 향하는 마지막 구간이다.
 */
public enum Purpose {

    CHARGE,          // 교통카드 충전 — 편의점 · 매표소
    BUY_CARD,        // 교통카드 구매 — 편의점 (구매와 충전을 한 번에)
    SINGLE_TICKET,   // 1회권 발권 — 발매기
    WITHDRAW_CASH,   // 현금 인출 — ATM
    TO_GATE          // 개찰구로 이동
}
