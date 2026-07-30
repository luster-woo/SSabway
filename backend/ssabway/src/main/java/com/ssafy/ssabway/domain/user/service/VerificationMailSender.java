package com.ssafy.ssabway.domain.user.service;

import com.ssafy.ssabway.global.common.Language;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class VerificationMailSender {

    private final JavaMailSender mailSender;

    public void send(String to, String code, Language language, int ttlSeconds) {
        int minutes = ttlSeconds / 60;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject(language));
        message.setText(body(code, minutes, language));

        mailSender.send(message);
    }

    private String subject(Language language) {
        return switch (language) {
            case KO -> "[SSabway] 이메일 인증 코드";
            case EN -> "[SSabway] Email Verification Code";
            case JA -> "[SSabway] メール認証コード";
            case ZH -> "[SSabway] 邮箱验证码";
        };
    }

    private String body(String code, int minutes, Language language) {
        return switch (language) {
            case KO -> """
                    SSabway 이메일 인증 코드입니다.

                    %s

                    인증 코드는 %d분 후 만료됩니다.
                    """.formatted(code, minutes);
            case EN -> """
                    Your SSabway email verification code:

                    %s

                    This code expires in %d minutes.
                    """.formatted(code, minutes);
            case JA -> """
                    SSabway のメール認証コードです。

                    %s

                    このコードは %d 分後に無効になります。
                    """.formatted(code, minutes);
            case ZH -> """
                    您的 SSabway 邮箱验证码：

                    %s

                    该验证码将在 %d 分钟后失效。
                    """.formatted(code, minutes);
        };
    }
}