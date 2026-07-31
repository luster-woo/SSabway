package com.ssafy.ssabway.domain.user.util;

import com.ssafy.ssabway.global.common.Language;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PasswordResetMailSender {

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
            case KO -> "[SSabway] 비밀번호 재설정 인증 코드";
            case EN -> "[SSabway] Password Reset Code";
            case JA -> "[SSabway] パスワード再設定コード";
            case ZH -> "[SSabway] 密码重置验证码";
        };
    }

    /*
        "본인이 요청하지 않았다면 무시" 안내가 필요하다.
        재설정 메일은 남이 내 이메일을 입력해서 받을 수 있어,
        안내가 없으면 사용자가 계정이 탈취된 줄 알고 놀란다
     */
    private String body(String code, int minutes, Language language) {
        return switch (language) {
            case KO -> """
                    SSabway 비밀번호 재설정 인증 코드입니다.

                    %s

                    인증 코드는 %d분 후 만료됩니다.
                    본인이 요청하지 않았다면 이 메일을 무시해주세요.
                    """.formatted(code, minutes);
            case EN -> """
                    Your SSabway password reset code:

                    %s

                    This code expires in %d minutes.
                    If you did not request this, please ignore this email.
                    """.formatted(code, minutes);
            case JA -> """
                    SSabway のパスワード再設定コードです。

                    %s

                    このコードは %d 分後に無効になります。
                    ご本人による操作でない場合は、このメールを無視してください。
                    """.formatted(code, minutes);
            case ZH -> """
                    您的 SSabway 密码重置验证码：

                    %s

                    该验证码将在 %d 分钟后失效。
                    如果这不是您本人的操作，请忽略此邮件。
                    """.formatted(code, minutes);
        };
    }
}