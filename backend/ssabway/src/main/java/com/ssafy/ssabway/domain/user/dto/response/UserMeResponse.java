package com.ssafy.ssabway.domain.user.dto.response;

import com.ssafy.ssabway.domain.user.entity.Provider;
import com.ssafy.ssabway.domain.user.entity.User;
import com.ssafy.ssabway.global.common.Language;

public record UserMeResponse (
        String email,
        Provider provider,
        Language language){

    public static UserMeResponse from(User user){
        return new UserMeResponse(user.getEmail(), user.getProvider(), user.getLanguage());
    }
}
