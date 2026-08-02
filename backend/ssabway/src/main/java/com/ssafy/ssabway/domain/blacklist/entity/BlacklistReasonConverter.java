package com.ssafy.ssabway.domain.blacklist.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

// 사유 여러 개를 reason 열에 쉼표로 구분해서 저장
// 구분자가 값에 섞이면 안 되므로 사유는 반드시 enum 상수명(영문)이어야 함.
@Converter
public class BlacklistReasonConverter implements AttributeConverter<Set<BlacklistReason>, String> {

    private static final String DELIMITER = ",";

    // 프런트에서 넘어온 사유를 DB에 저장하기 좋게 변환
    @Override
    public String convertToDatabaseColumn(Set<BlacklistReason> reasons) {

        if (reasons == null || reasons.isEmpty()) return null;

        return reasons.stream()
                .map(Enum::name)
                .collect(Collectors.joining(DELIMITER));
    }

    // DB에서 꺼내서 프런트로 보내주기 위해 변환
    @Override
    public Set<BlacklistReason> convertToEntityAttribute(String dbData) {

        if (dbData == null || dbData.isBlank()) return new LinkedHashSet<>();

        return Arrays.stream(dbData.split(DELIMITER))
                .map(BlacklistReason::valueOf)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
