package com.ssafy.ssabway.global.common;

import org.springframework.data.domain.Page;

import java.util.List;

// 페이징 응답 공통 형식
// 스프링의 Page를 그대로 넣으면 필요하지 않은 값도 들어가서 필요한 것만 골라서 담음
public record PageResponse<T>(List<T> content, PageInfo page) {

    // Page -> PageResponse 변환 메서드
    //
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                new PageInfo(
                        // 프론트는 1, 2, 3 페이지로 세지만
                        // 스프링은 0, 1, 2로 페이지를 셈
                        // 그래서 응답에는 +1을 해줘서 주어야 하고, 컨트롤러에서 조회 시에는 -1을 해서 조회 필요
                        page.getNumber() + 1,
                        page.getSize(),
                        page.getTotalElements(),
                        page.getTotalPages(),
                        page.isFirst(),
                        page.isLast()
                )
        );
    }

    public record PageInfo(
            int number,
            int size,
            long totalElements,
            int totalPages,
            boolean first,
            boolean last
    ) {}
}
