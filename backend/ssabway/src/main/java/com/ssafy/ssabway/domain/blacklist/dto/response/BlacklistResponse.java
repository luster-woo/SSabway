package com.ssafy.ssabway.domain.blacklist.dto.response;

import com.ssafy.ssabway.domain.blacklist.entity.BlacklistReason;

import java.time.LocalDateTime;
import java.util.Set;

public record BlacklistResponse (
        String userEmail,
        Set<BlacklistReason> reasons,
        LocalDateTime registeredAt){
}
