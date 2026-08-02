package com.ssafy.ssabway.domain.blacklist.dto.request;

import com.ssafy.ssabway.domain.blacklist.entity.BlacklistReason;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record BlacklistRegisterRequest(
        @NotBlank @Email String userEmail,
        @NotEmpty Set<BlacklistReason> reasons) {
}
