package com.ssafy.ssabway_webrtc.domain.config;

import com.ssafy.ssabway_webrtc.common.jwt.JwtAccessDeniedHandler;
import com.ssafy.ssabway_webrtc.common.jwt.JwtAuthenticationEntryPoint;
import com.ssafy.ssabway_webrtc.common.jwt.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter
        jwtAuthenticationFilter;

    private final JwtAuthenticationEntryPoint
        jwtAuthenticationEntryPoint;

    private final JwtAccessDeniedHandler
        jwtAccessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http
    ) throws Exception {

        http
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )
            .authorizeHttpRequests(auth -> auth
                // OpenVidu가 호출하므로 JWT 대신 Webhook Secret을 검증합니다.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/v1/openvidu/webhooks"
                ).permitAll()
                // 사용자만 상담 요청 가능
                .requestMatchers(HttpMethod.POST,
                    "/api/v1/consultations")
                .hasAuthority("USER")

                // 역무원 API는 STAFF만 접근 가능
                .requestMatchers("/api/v1/admin/**")
                .hasAuthority("STAFF")
                .requestMatchers("/api/v1/**")
                .authenticated()
                .anyRequest()
                .denyAll()
            )
            .exceptionHandling(handler -> handler
                .authenticationEntryPoint(
                    jwtAuthenticationEntryPoint
                )
                .accessDeniedHandler(
                    jwtAccessDeniedHandler
                )
            )
            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}
