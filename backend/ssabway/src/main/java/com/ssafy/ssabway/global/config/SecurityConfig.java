package com.ssafy.ssabway.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;


/*
    Spring Security 설정 클래스
    SecurityFilterChain 타입의 빈이 등록되면, Boot는 기본 필터 체인을 사용하지 않고 해당 빈 사용
    아래의 설정이 보안 필터 구성 전체
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CSRF 보호 필터 OFF
                // 켜져 있으면 POST/PUT/PATCH/DELETE 요청에 CSRF 토큰이 없을 때 403 반환됨
                .csrf(AbstractHttpConfigurer::disable)

                // 폼 로그인 기능 OFF
                // 켜져 있으면 /login 경로에 로그인 & 인증 처리 핸들러 자동 등록됨
                // 인증되지 않은 요청은 302로 그 페이지로 리다이렉트 되어버림
                .formLogin(AbstractHttpConfigurer::disable)

                // HTTP Basic 인증 OFF
                // 켜져 있으면 인증 실패 시 WWW-Authenticate 헤더가 내려가 브라우저 인증 팝업이 뜸
                .httpBasic(AbstractHttpConfigurer::disable)

                // 세션 생성 정책을 STATELESS로 설정 (JWT 방식은 세션 사용 X)
                // 서버가 HttpSession을 만들지 않고 기존 세션도 조회 X
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // URL 패턴별 접근 권한 규칙 설정, 위에서부터 순서대로 매칭
                .authorizeHttpRequests(auth -> auth
                        // anyRequest() : 앞의 규칙에 걸리지 않은 나머지 전부
                        // permitAll() : 인증 여부와 무관하게 통과
                        // FIXME: 인증이 필요한 api들에 대해서 나중에 설정 필요
                        //   .requestMatchers("/api/v1/users/**", "/api/v1/auth/**").permitAll()
                        //   .anyRequest().authenticated()
                        .anyRequest().permitAll()
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // 기본 알고리즘은 bcrypt, 해시 앞에 {bcrypt} 같은 알고리즘 식별자가 붙어 저장
        // matches() 호출 시 저장된 해시의 접두사를 읽어 해당 알고리즘의 인코더로 검증을 위임
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
