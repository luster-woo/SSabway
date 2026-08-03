import { http, HttpResponse, type HttpHandler, type RequestHandler } from 'msw'

import {
  createMockConnection,
  createMockConsultation,
  endMockConsultation,
  issueMockConsultationToken,
  listMockWaitingConsultations,
  openMockSession,
  pollMockConsultation,
  startMockConsultation,
} from '@/mocks/consultationQueue'
import { MOCK_SWITCH, type MockSwitchKey } from '@/mocks/mockSwitch'
// 목 데이터가 화면 목과 어긋나면 안 되어 user 쪽 원본을 그대로 쓴다.
// (mocks 는 개발 전용이라 user 레이어 참조가 번들 분리를 해치지 않는다)
import { MOCK_ROUTE_GUIDE } from '@/user/features/route-guide/lib/mockRouteGuide'

import {
  CODE_TIME_LIMIT_SEC,
  CONSULTATION_RECORDS,
  MIN_PASSWORD_LENGTH,
  NEARBY_STATION,
  RATE_LIMITED_EMAIL,
  REFRESH_COOKIE,
  STAFF_ACCOUNT,
  TAKEN_EMAILS,
  USER_ACCOUNT,
  USER_LANGUAGE,
  VALID_CODE,
  VERIFICATION_EXPIRED_EMAIL,
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
 * 실서버로 보낼 엔드포인트는 이 배열에서 지우지 말고 mockSwitch.ts 에서 끈다.
 * 꺼진 핸들러는 등록되지 않아 실제 서버로 넘어간다.
 * (browser.ts 의 onUnhandledRequest: 'bypass')
 *
 * 경로는 client.ts 의 baseURL 과 맞춰 절대 경로로 적는다.
 */
export const BASE = '*/api/v1'

/** 상태를 들고 있지 않으므로 새로고침하면 처음부터 다시 시작한다. */
const mockHandlers: HttpHandler[] = [
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

  // 재설정용 인증 메일 발송 (BE PasswordController, 개발완료)
  //
  // 회원가입 발송과 판정이 정반대다: 가입된 이메일이어야 정상이고,
  // 가입되지 않은 이메일이면 404 USER_NOT_FOUND. 응답 형식은 회원가입 발송과 동일.
  http.post(`${BASE}/users/password/email/requests`, async ({ request }) => {
    const { email } = (await request.json()) as { email?: string }

    if (email === RATE_LIMITED_EMAIL) {
      return HttpResponse.json(
        errorBody('요청 횟수를 초과했습니다.', 'EMAIL_SEND_LIMIT_EXCEEDED'),
        { status: 429 },
      )
    }

    if (!email?.includes('@')) {
      return HttpResponse.json(
        errorBody('잘못된 형식의 요청 값입니다.', 'INVALID_INPUT_VALUE'),
        { status: 400 },
      )
    }

    // 만료 재현용 계정(VERIFICATION_EXPIRED_EMAIL)도 가입된 것으로 취급해
    // 발송·인증을 통과시키고, 마지막 PATCH /users/password 에서
    // 400 EMAIL_NOT_VERIFIED 를 받게 한다.
    const isRegistered =
      TAKEN_EMAILS.includes(email.toLowerCase()) ||
      email === VERIFICATION_EXPIRED_EMAIL

    if (!isRegistered) {
      return HttpResponse.json(
        errorBody('가입되지 않은 이메일입니다.', 'USER_NOT_FOUND'),
        { status: 404 },
      )
    }

    return HttpResponse.json(
      okBody('인증 메일이 발송되었습니다.', { timeLimit: CODE_TIME_LIMIT_SEC }),
    )
  }),

  // 재설정용 인증코드 확인 (BE PasswordController, 개발완료)
  //
  // 회원가입용 인증코드 확인과 URL 만 다르고 요청·응답 형식은 같다.
  // BE 는 두 흐름의 인증 상태를 별도 저장소(verify:* / reset:*)에 두므로
  // 목도 엔드포인트를 분리해 프론트가 올바른 쪽을 부르는지 검증한다.
  http.post(
    `${BASE}/users/password/email/verification`,
    async ({ request }) => {
      const { code } = (await request.json()) as { code?: string }

      // 서버가 trim + 대문자 변환 후 비교한다 (BE PasswordResetService)
      if ((code ?? '').trim().toUpperCase() !== VALID_CODE) {
        return HttpResponse.json(
          errorBody(
            '인증 코드가 일치하지 않습니다.',
            'VERIFICATION_CODE_MISMATCH',
          ),
          { status: 400 },
        )
      }

      return HttpResponse.json(okBodyWithoutData('인증이 완료되었습니다.'))
    },
  ),

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

  // 비밀번호 재설정 실행 (BE: PATCH /users/password, 인증 토큰 불필요)
  //
  // 같은 400 이라도 의미가 둘이라 code 필드가 필수다.
  //   EMAIL_NOT_VERIFIED  — 인증 안 됨·만료 (프론트: "인증이 만료됐어요")
  //   INVALID_INPUT_VALUE — 비밀번호 형식 위반 (프론트: "형식이 올바르지 않아요")
  // usePasswordReset 의 toResetErrorKey 가 이 code 로 문구를 가른다.
  //
  // 실제 서버는 "이 이메일이 인증됐고 30분 안이다"(reset:done 키)를 검사한다.
  // 목은 상태를 들고 있지 않으므로 만료 흐름을 VERIFICATION_EXPIRED_EMAIL 로 재현한다.
  http.patch(`${BASE}/users/password`, async ({ request }) => {
    const { email, newPassword } = (await request.json()) as {
      email?: string
      newPassword?: string
    }

    if (email === VERIFICATION_EXPIRED_EMAIL) {
      return HttpResponse.json(
        errorBody('이메일 인증이 필요합니다.', 'EMAIL_NOT_VERIFIED'),
        { status: 400 },
      )
    }

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return HttpResponse.json(
        errorBody('잘못된 형식의 요청 값입니다.', 'INVALID_INPUT_VALUE'),
        { status: 400 },
      )
    }

    return HttpResponse.json(okBodyWithoutData('비밀번호가 변경되었습니다.'))
  }),

  // 회원 탈퇴 (Soft Delete)
  //
  // 명세: PATCH /users, body { password }, Authorization 필수. (백엔드 개발완료)
  // 명세의 상태코드는 200/401 뿐이라 "토큰 인증 실패"와 "비밀번호 불일치"가
  // 둘 다 401 이다. useWithdraw 는 401 을 받으면 토큰을 재발급해 한 번
  // 재시도하고, 그래도 401 이면 비밀번호 불일치로 판정한다.
  http.patch(`${BASE}/users`, async ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json(errorBody('인증이 필요합니다.'), { status: 401 })
    }

    const { password } = (await request.json()) as { password?: string }

    if (password !== USER_ACCOUNT.password) {
      return HttpResponse.json(errorBody('비밀번호가 일치하지 않습니다.'), {
        status: 401,
      })
    }

    // 탈퇴하면 서버가 리프레시 토큰도 무효화한다. 쿠키를 즉시 만료시킨다.
    return HttpResponse.json(okBodyWithoutData('회원탈퇴에 성공하였습니다.'), {
      headers: { 'Set-Cookie': expiredRefreshCookie() },
    })
  }),

  // 회원 선호 언어 설정 (BE 개발완료)
  //
  // 시작 페이지 이탈 시 fire-and-forget 으로 나가는 요청이라 화면에 결과가
  // 보이지 않는다. 목의 역할은 devtools Network 탭에서 "언제 나가는지"를
  // 확인시켜 주는 것이다. (칩 클릭마다 나가면 잘못 붙인 것)
  http.patch(`${BASE}/users/language`, async ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json(errorBody('인증이 필요합니다.'), { status: 401 })
    }

    const { language } = (await request.json()) as { language?: string }

    if (!language || !['KO', 'EN', 'JA', 'ZH'].includes(language)) {
      return HttpResponse.json(errorBody('잘못된 형식의 요청 값입니다.'), {
        status: 400,
      })
    }

    return HttpResponse.json(okBodyWithoutData('언어 설정 완료했습니다.'))
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

  // 관리자(역무원) 로그인 — ✅ BE 개발완료
  //
  // 실서버가 있지만, 배포 백엔드가 내려가 있거나(502) 로컬 백엔드 없이
  // admin 화면을 확인할 때를 위해 목을 둔다. 기본값은 mockSwitch 참고.
  // 응답 data 는 { accessToken, staffCode } (useAdminLogin 의 AdminLoginData).
  // 리프레시 쿠키는 사용자 로그인과 같은 방식으로 내려준다 (auth/refresh 공통).
  http.post(`${BASE}/staffs/login`, async ({ request }) => {
    const { staffCode, password } = (await request.json()) as {
      staffCode?: string
      password?: string
    }

    if (
      staffCode !== STAFF_ACCOUNT.staffCode ||
      password !== STAFF_ACCOUNT.password
    ) {
      return HttpResponse.json(
        errorBody('관리자 코드 또는 비밀번호가 일치하지 않습니다.'),
        { status: 401 },
      )
    }

    return HttpResponse.json(
      okBody('로그인 되었습니다.', {
        accessToken: issueAccessToken('admin'),
        staffCode,
      }),
      { headers: { 'Set-Cookie': refreshCookie() } },
    )
  }),

  // 회원 구글 로그인 / 회원가입 (백엔드 개발중)
  //
  // 명세상 응답은 일반 로그인과 동일하다. 신규 가입 여부(isNewUser)는 없다.
  // language 는 "신규 가입 시에만 사용" 이므로 프론트가 항상 보내고 여기서는
  // 검사하지 않는다. (실제 서버도 기존 회원이면 무시한다)
  //
  // idToken 은 구글이 서명한 JWT 라 목에서 검증할 방법이 없다. 값이 있는지만 본다.
  // 서명·aud·iss·exp 검증은 서버가 한다.
  http.post(`${BASE}/users/login/google`, async ({ request }) => {
    const { idToken } = (await request.json()) as { idToken?: string }

    if (!idToken) {
      return HttpResponse.json(
        errorBody('구글 인증 정보가 올바르지 않습니다.'),
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

  // GPS 기반 근처 역 반환 (명세 「경로」 카테고리, BE 개발전)
  //
  // 목은 좌표를 쓰지 않고 고정된 역 하나를 돌려준다. 여기서 확인할 것은
  // "권한 → 좌표 → 역 이름" 이 화면까지 이어지는가이지 역 판정이 아니다.
  //
  // 명세의 상태코드는 200 / 400 두 개뿐이다. 400 은 좌표가 빠졌을 때 낸다.
  http.get(`${BASE}/routes/gps`, ({ request }) => {
    const params = new URL(request.url).searchParams

    // Number(null) 과 Number('') 은 0 이라 숫자 변환만으로는 누락을 못 걸러낸다.
    const isCoord = (value: string | null) =>
      value !== null && value.trim() !== '' && Number.isFinite(Number(value))

    if (!isCoord(params.get('latitude')) || !isCoord(params.get('longitude'))) {
      return HttpResponse.json(errorBody('잘못된 형식의 요청 값입니다.'), {
        status: 400,
      })
    }

    return HttpResponse.json(
      okBody('근처 역 조회 성공', { station: NEARBY_STATION }),
    )
  }),

  // 역 내 경로 제공 (명세 「경로」 카테고리, BE 개발전)
  //
  // 응답의 steps[].point(도면 좌표)는 명세 제안 필드다 — 현재 노션 명세에는
  // 좌표가 없어 "역 내 현재 위치" 지도를 그릴 수 없다. FE 가 형태를 먼저
  // 굳혀 BE 에 요청한 상태 (shared/types/routeGuide.ts 의 GuidePoint 참고).
  // 비로그인에도 길안내는 동작해야 하므로 인증을 요구하지 않는다.
  http.post(`${BASE}/routes/navi`, () =>
    HttpResponse.json(okBody('경로 안내 조회 성공', MOCK_ROUTE_GUIDE)),
  ),

  /* ---------------------------------------------------------------- *
   * 상담 대기열 — ⚠️ BE 미구현 (BACKEND_READY.CONSULTATION_STATUS)
   *
   * 이 목이 있는 동안에는 플래그를 true 로 켜면 MSW 만으로
   * "요청 → 대기 순번 감소 → 매칭 → 토큰 발급" 흐름을 확인할 수 있다.
   * 상태는 consultationQueue.ts 가 들고 있다.
   * BE 가 배포되면 mockSwitch 에서 상담 3종을 끄고 실서버로 검증한다.
   * ---------------------------------------------------------------- */

  // 상담 요청 → 대기열 등록
  http.post(`${BASE}/consultations`, ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json(errorBody('인증이 필요합니다.'), { status: 401 })
    }

    const result = createMockConsultation()

    if (result === 'DUPLICATED') {
      return HttpResponse.json(
        errorBody('중복된 상담요청입니다.', 'CONSULTATION_DUPLICATED'),
        { status: 409 },
      )
    }

    return HttpResponse.json(okBody('상담이 요청되었습니다.', result), {
      status: 201,
    })
  }),

  // 상담 상태 조회 — useConsultationMatch 가 3초 간격으로 폴링한다
  http.get(`${BASE}/consultations/:consultationId`, ({ request, params }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json(errorBody('인증이 필요합니다.'), { status: 401 })
    }

    const snapshot = pollMockConsultation(Number(params.consultationId))

    if (!snapshot) {
      return HttpResponse.json(
        errorBody('존재하지 않는 상담입니다.', 'RESOURCE_NOT_FOUND'),
        { status: 404 },
      )
    }

    return HttpResponse.json(okBody('상담 상태 조회 성공', snapshot))
  }),

  // 접속 토큰 발급 — MATCHED 확인 후 1회 호출된다
  http.post(
    `${BASE}/consultations/:consultationId/token`,
    ({ request, params }) => {
      if (!request.headers.get('Authorization')) {
        return HttpResponse.json(errorBody('인증이 필요합니다.'), {
          status: 401,
        })
      }

      const result = issueMockConsultationToken(Number(params.consultationId))

      if (result === 'NOT_FOUND') {
        return HttpResponse.json(
          errorBody('존재하지 않는 상담입니다.', 'RESOURCE_NOT_FOUND'),
          { status: 404 },
        )
      }

      // 매칭 전 발급 요청. 정상 흐름에서는 오지 않는다 — BE 확정 시 코드 맞출 것.
      if (result === 'NOT_MATCHED') {
        return HttpResponse.json(
          errorBody('아직 매칭되지 않은 상담입니다.', 'CONSULTATION_NOT_MATCHED'),
          { status: 409 },
        )
      }

      return HttpResponse.json(okBody('토큰이 발급되었습니다.', result))
    },
  ),

  /* ---------------------------------------------------------------- *
   * 관리자 — 상담 대기 목록 (BE 미구현, BACKEND_READY.ADMIN_QUEUE 참고)
   *
   * ADMIN_QUEUE 플래그를 켜면 useWaitingConsultations 가 이 목으로 온다.
   * 목록은 consultationQueue 의 공유 상태(localStorage)에서 읽으므로,
   * user 탭이 요청한 상담이 admin 탭 목록에 그대로 나타난다.
   * ---------------------------------------------------------------- */
  http.get(`${BASE}/staffs/waiting`, ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json(errorBody('인증이 필요합니다.'), { status: 401 })
    }

    // 백엔드 WaitingResponse 형태(departure/destination/language)로 내려준다.
    const content = listMockWaitingConsultations().map((item) => ({
      consultationId: item.consultationId,
      email: item.email,
      departure: item.startPoint,
      destination: item.finalPoint,
      language: item.langCode,
      requestedAt: item.requestedAt,
    }))

    return HttpResponse.json(
      okBody('대기 목록 조회 성공', {
        content,
        // 백엔드 PageResponse 와 같은 모양 (목은 한 페이지, size 6)
        page: {
          number: 1,
          size: 6,
          totalElements: content.length,
          totalPages: 1,
          first: true,
          last: true,
        },
      }),
    )
  }),

  /* ---------------------------------------------------------------- *
   * 관리자 — 원본 상담 내역(녹취) 조회. ✅ BE 개발완료
   *
   * 응답 모양은 BE ConsultationDetailResponse 기준 —
   * email / summary / recordUrl / expiresIn.
   * ⚠️ 노션 명세 표의 `S3_path` 가 아니다. 표가 낡았고 예시 JSON 이 맞다.
   *
   * useConsultationRecord 가 다뤄야 하는 네 갈래를 모두 재현한다.
   *   정상        → recordUrl 있음 (플레이어 재생)
   *   ID 124      → recordUrl·expiresIn null (녹취 없음 → 플레이어 감춤)
   *   없는 ID     → 404 CONSULTATION_NOT_FOUND (BE 는 남의 역 상담도 이 응답)
   *   id 누락·형식 → 400 INVALID_INPUT_VALUE
   * ---------------------------------------------------------------- */
  http.get(`${BASE}/staffs/consultations`, ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json(errorBody('인증이 필요합니다.'), { status: 401 })
    }

    // BE 는 @RequestParam Long id 라, 없으면 MissingServletRequestParameter,
    // 숫자가 아니면 MethodArgumentTypeMismatch — 둘 다 400 INVALID_INPUT_VALUE 다.
    const rawId = new URL(request.url).searchParams.get('id')
    const id = Number(rawId)

    if (rawId === null || rawId === '' || !Number.isInteger(id) || id <= 0) {
      return HttpResponse.json(
        errorBody('잘못된 형식의 요청 값입니다.', 'INVALID_INPUT_VALUE'),
        { status: 400 },
      )
    }

    const record = CONSULTATION_RECORDS[id]

    if (record === undefined) {
      return HttpResponse.json(
        errorBody('존재하지 않는 상담입니다.', 'CONSULTATION_NOT_FOUND'),
        { status: 404 },
      )
    }

    return HttpResponse.json(okBody('조회에 성공하였습니다.', record))
  }),

  /* ---------------------------------------------------------------- *
   * 화상연결(signaling) — ✅ BE 개발완료
   *
   * 실서버가 있으므로 mockSwitch 기본값이 false 다(등록 안 됨 → 실서버로).
   * 한 컴퓨터에서 user + admin 매칭 실험을 할 때만 네 개를 함께 켠다.
   * 켜면: admin 수락(accept)이 공유 상태를 MATCHED 로 바꾸고,
   * user 의 커넥션 폴링(joinSession)이 404 → 토큰 발급으로 풀린다.
   * 응답 모양은 BE 실코드(StaffConsultationController·OpenViduController, 8/3) 기준.
   * ---------------------------------------------------------------- */

  // 역무원 수락 — accept 1-call (상태 잠금 + 세션 생성 + 토큰 발급)
  http.post(
    `${BASE}/staffs/consultations/:consultationId/accept`,
    ({ params }) => {
      const consultationId = Number(params.consultationId)

      if (!Number.isInteger(consultationId) || consultationId <= 0) {
        return HttpResponse.json(
          errorBody('잘못된 형식의 요청 값입니다.', 'INVALID_INPUT_VALUE'),
          { status: 400 },
        )
      }

      const sessionId = openMockSession(consultationId)
      const connection = createMockConnection(sessionId)

      return HttpResponse.json(
        okBody('상담이 수락되었습니다.', {
          consultationId,
          sessionId,
          token: connection?.token ?? `mock-openvidu-token-${sessionId}`,
          status: 'MATCHED',
        }),
      )
    },
  ),

  // 커넥션(접속 토큰) 발급 — 세션이 없으면 404 (사용자 폴링이 이 404 에 기댄다)
  // 참여자 식별·역할은 JWT 몫이라 요청 본문이 없다 (BE 8/2 권한 업데이트).
  // 목은 JWT 를 검증하지 못하므로 인가(403) 분기는 흉내 내지 않는다.
  http.post(
    `${BASE}/openvidu/sessions/:sessionId/connections`,
    ({ params }) => {
      const result = createMockConnection(String(params.sessionId))

      if (!result) {
        return HttpResponse.json(
          errorBody(
            '존재하지 않는 화상 상담 세션입니다.',
            'OPENVIDU_SESSION_NOT_FOUND',
          ),
          { status: 404 },
        )
      }

      return HttpResponse.json(okBody('커넥션이 생성되었습니다.', result))
    },
  ),

  // 상담 시작 — BE 실응답은 { sessionId, status } (started 아님)
  http.post(`${BASE}/openvidu/sessions/:sessionId/start`, ({ params }) => {
    const sessionId = String(params.sessionId)
    const status = startMockConsultation(sessionId)

    if (!status) {
      return HttpResponse.json(
        errorBody(
          '존재하지 않는 화상 상담 세션입니다.',
          'OPENVIDU_SESSION_NOT_FOUND',
        ),
        { status: 404 },
      )
    }

    return HttpResponse.json(
      okBody('상담이 시작되었습니다.', { sessionId, status }),
    )
  }),

  // 상담 종료 — BE 실응답은 { sessionId, recordingId, status }. 재요청에 멱등.
  http.post(`${BASE}/openvidu/sessions/:sessionId/end`, ({ params }) => {
    const sessionId = String(params.sessionId)
    const { recordingId } = endMockConsultation(sessionId)

    return HttpResponse.json(
      okBody('상담이 종료되었습니다.', {
        sessionId,
        recordingId,
        status: 'ENDED',
      }),
    )
  }),

]

/** 핸들러의 method + path 를 mockSwitch.ts 의 키 형식으로 바꾼다. */
function toSwitchKey(handler: HttpHandler): string {
  const { method, path } = handler.info
  return `${String(method)} ${String(path).replace(BASE, '')}`
}

/**
 * 실제로 등록되는 핸들러 — MOCK_SWITCH 에서 켜진 것만.
 *
 * 꺼진 엔드포인트는 워커에 등록되지 않으므로 bypass 로 실서버에 나간다.
 * 실서버 쪽 오류로 테스트가 막히면 스위치만 되돌리면 된다.
 */
export const handlers: RequestHandler[] = mockHandlers.filter((handler) => {
  const key = toSwitchKey(handler)

  if (!(key in MOCK_SWITCH)) {
    // 핸들러를 새로 만들고 스위치 추가를 잊은 경우다. 목을 유지하는 쪽이
    // 안전하므로(실서버 강제 노출 방지) 경고만 남기고 등록한다.
    console.warn(`[mocks] mockSwitch.ts 에 항목이 없습니다: '${key}'`)
    return true
  }

  return MOCK_SWITCH[key as MockSwitchKey]
})
