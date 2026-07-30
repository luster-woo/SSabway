package com.ssafy.ssabway.global.config;

import com.ssafy.ssabway.global.jwt.JwtAccessDeniedHandler;
import com.ssafy.ssabway.global.jwt.JwtAuthenticationEntryPoint;
import com.ssafy.ssabway.global.jwt.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


/*
    Spring Security 설정 클래스
    SecurityFilterChain 타입의 빈이 등록되면, Boot는 기본 필터 체인을 사용하지 않고 해당 빈 사용
    아래의 설정이 보안 필터 구성 전체
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;

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

                        // POST /api/v1/users : 회원가입 API라 열어야 함.
                        // 하지만 동일 엔드포인트에 PUT(비밀번호 변경), PATCH(탈퇴)는 같은 URL 이므로 메서드까지 지정
                        .requestMatchers(HttpMethod.POST, "/api/v1/users").permitAll()

                        // 로그인 & 이메일 중복 & 이메일 발송|검증 & 로그아웃|액세스 토큰 재발급 허용
                        .requestMatchers("/api/v1/users/login").permitAll()
                        .requestMatchers("/api/v1/users/exists").permitAll()
                        .requestMatchers("/api/v1/users/email/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // 나머지는 모두 인증 필요함
                        .anyRequest().authenticated()
                )

                // 인증 실패(401) / 권한 부족(403) 응답을 핸들러를 추가함으로써 ApiResponse 형태로 통일
                .exceptionHandling(handler -> handler
                                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                                        .accessDeniedHandler(jwtAccessDeniedHandler))


                // authorizeHttpRequests에 적은 규칙으로 넘어가기 전 jwtAuthenticationFilter 작동
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // 기본 알고리즘은 bcrypt, 해시 앞에 {bcrypt} 같은 알고리즘 식별자가 붙어 저장
        // matches() 호출 시 저장된 해시의 접두사를 읽어 해당 알고리즘의 인코더로 검증을 위임
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
