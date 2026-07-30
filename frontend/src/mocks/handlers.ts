import { http, HttpResponse, type RequestHandler } from 'msw'

import {
  CODE_TIME_LIMIT_SEC,
  RATE_LIMITED_EMAIL,
  REFRESH_COOKIE,
  TAKEN_EMAILS,
  USER_ACCOUNT,
  USER_LANGUAGE,
  VALID_CODE,
  errorBody,
  expiredRefreshCookie,
  issueAccessToken,
  okBody,
  okBodyWithoutData,
  refreshCookie,
} from '@/mocks/data'

/**
 * 요청을 가로채는 규칙.
 *
 * 응답 값은 data.ts 에 모아두고 여기서는 규칙만 다룬다.
 * BE 연동이 끝난 엔드포인트는 이 배열에서 지우면 실제 서버로 넘어간다.
 * (browser.ts 의 onUnhandledRequest: 'bypass')
 *
 * 경로는 client.ts 의 baseURL 과 맞춰 절대 경로로 적는다.
 */
export const BASE = '*/api/v1'

/** 상태를 들고 있지 않으므로 새로고침하면 처음부터 다시 시작한다. */
export const handlers: RequestHandler[] = [
  // 이메일 중복 확인
  // 조회 자체는 성공이므로 중복이어도 200 이다. (BE UserController 와 동일)
  http.get(`${BASE}/users/exists`, ({ request }) => {
    const email = new URL(request.url).searchParams.get('email') ?? ''

    if (!email.includes('@')) {
      return HttpResponse.json(errorBody('잘못된 형식의 요청 값입니다.'), {
        status: 400,
      })
    }

    const isDuplicate = TAKEN_EMAILS.includes(email.toLowerCase())

    return HttpResponse.json(
      okBody(
        isDuplicate
          ? '이미 사용 중인 이메일입니다.'
          : '사용 가능한 이메일입니다.',
        { isDuplicate },
      ),
    )
  }),

  // 인증 메일 발송
  http.post(`${BASE}/users/email/requests`, async ({ request }) => {
    const { email } = (await request.json()) as { email?: string }

    if (email === RATE_LIMITED_EMAIL) {
      return HttpResponse.json(errorBody('요청 횟수를 초과했습니다.'), {
        status: 429,
      })
    }

    if (email && TAKEN_EMAILS.includes(email.toLowerCase())) {
      return HttpResponse.json(errorBody('중복된 이메일입니다.'), {
        status: 409,
      })
    }

    if (!email?.includes('@')) {
      return HttpResponse.json(errorBody('잘못된 형식의 요청 값입니다.'), {
        status: 400,
      })
    }

    return HttpResponse.json(
      okBody('인증 코드가 발송되었습니다.', { timeLimit: CODE_TIME_LIMIT_SEC }),
    )
  }),

  // 인증 코드 검증
  http.post(`${BASE}/users/email/verification`, async ({ request }) => {
    const { code } = (await request.json()) as { code?: string }

    // 서버는 대소문자를 구분하지 않는다 (BE 확인)
    if ((code ?? '').toUpperCase() !== VALID_CODE) {
      return HttpResponse.json(errorBody('인증 코드가 일치하지 않습니다.'), {
        status: 400,
      })
    }

    return HttpResponse.json(
      okBodyWithoutData('인증번호 검증이 완료되었습니다.'),
    )
  }),

  // 회원가입
  http.post(`${BASE}/users`, async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email?: string
      password?: string
    }

    if (email && TAKEN_EMAILS.includes(email.toLowerCase())) {
      return HttpResponse.json(errorBody('중복된 이메일입니다.'), {
        status: 409,
      })
    }

    if (!password || password.length < 8) {
      return HttpResponse.json(errorBody('비밀번호는 8자 이상이어야 합니다.'), {
        status: 400,
      })
    }

    return HttpResponse.json(okBodyWithoutData('회원가입이 완료되었습니다.'), {
      status: 201,
    })
  }),

  /* ---------------------------------------------------------------- *
   * 인증
   * ---------------------------------------------------------------- */

  // 회원 일반 로그인
  //
  // 이 엔드포인트는 노션에 "백엔드 개발완료"로 표시되어 있다. 그런데도 목을 두는
  // 이유는 배포 주소가 나오기 전까지 백엔드 없이 화면을 확인해야 하기 때문이다.
  // 백엔드에 붙여 확인할 때는 이 핸들러를 지우거나 USE_MSW 를 false 로 둘 것.
  // (목이 통과시키는 계정으로만 로그인되므로, 실서버와 다르다는 사실을 잊기 쉽다.)
  http.post(`${BASE}/users/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email?: string
      password?: string
    }

    if (email !== USER_ACCOUNT.email || password !== USER_ACCOUNT.password) {
      return HttpResponse.json(
        errorBody('이메일 또는 비밀번호가 일치하지 않습니다.'),
        { status: 401 },
      )
    }

    return HttpResponse.json(
      okBody('로그인 되었습니다.', {
        accessToken: issueAccessToken('user'),
        language: USER_LANGUAGE,
      }),
      { headers: { 'Set-Cookie': refreshCookie() } },
    )
  }),

  // 로그아웃 (사용자·관리자 공통 엔드포인트. 지금은 사용자만 호출한다)
  // 명세의 401(액세스 토큰 인증 실패)을 재현하려고 헤더 유무만 본다.
  http.post(`${BASE}/auth/logout`, ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json(errorBody('인증이 필요합니다.'), { status: 401 })
    }

    return HttpResponse.json(okBodyWithoutData('로그아웃 성공'), {
      headers: { 'Set-Cookie': expiredRefreshCookie() },
    })
  }),

  // 토큰 재발급 (사용자·관리자 공통)
  //
  // 아직 노션 엔드포인트 표에 없는 API 다. client.ts 의 401 인터셉터와
  // restoreSession 이 이 경로를 호출하므로, 목이 없으면 실서버에서 404 를 받고
  // 곧바로 로그인 화면으로 튕긴다. 즉 재시도 로직을 확인할 방법이 없어진다.
  //
  // 로그인하지 않았으면 401 이어야 한다. 무조건 200 을 주면 새로고침만으로
  // 로그인 상태가 되어 비로그인 흐름을 확인할 수 없다.
  http.post(`${BASE}/auth/refresh`, ({ cookies }) => {
    if (!cookies[REFRESH_COOKIE]) {
      return HttpResponse.json(errorBody('로그인이 필요합니다.'), {
        status: 401,
      })
    }

    return HttpResponse.json(
      okBody('토큰이 재발급되었습니다.', {
        accessToken: issueAccessToken('refresh'),
      }),
    )
  }),
]
