import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'

import { publicApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiErrorBody, ApiResponse } from '@/shared/types/api'
import type { Language } from '@/shared/types/user'
import {
  toErrorKey,
  type ErrorKeyTable,
} from '@/user/features/auth/lib/mockHttpError'

/** 명세가 요구하는 언어 코드. */
export type LangCode = Uppercase<Language>

/**
 * 앱 언어를 명세의 언어 코드로 바꾼다.
 *
 * toUpperCase() 결과를 단정(as)하지 않고 표로 두는 이유는,
 * 지원 언어가 늘었을 때 표를 채우지 않으면 컴파일이 깨지도록 만들기 위함이다.
 */
const LANG_CODE: Record<Language, LangCode> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  zh: 'ZH',
}

export function toLangCode(language: Language): LangCode {
  return LANG_CODE[language]
}

/** 인증 발송 요청 본문. language 는 인증 메일의 언어를 결정한다. */
export interface EmailRequestBody {
  email: string
  /** 명세는 KO / EN / JA / ZH 로 받는다. */
  language: LangCode
}

export interface EmailVerifyBody {
  email: string
  code: string
}

/**
 * 인증코드 길이. 명세("인증코드 (알파벳 + 숫자 7자리)", 예시 "A7KM3PQ") 기준이다.
 */
export const CODE_LENGTH = 7

/**
 * 영문·숫자만 남기고 길이를 자른다.
 *
 * 서버는 대소문자를 구분하지 않으므로 입력한 대소문자를 그대로 둔다.
 * 공백·하이픈은 붙여넣기 사고를 막기 위해 걸러낸다.
 */
export function normalizeCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').slice(0, CODE_LENGTH)
}

/** 인증 단계. 발송 전 → 발송됨(입력 대기) → 인증 완료 */
export const VERIFY_STEP = {
  IDLE: 'idle',
  SENT: 'sent',
  VERIFIED: 'verified',
} as const

export type VerifyStep = (typeof VERIFY_STEP)[keyof typeof VERIFY_STEP]

/**
 * 실패 문구의 i18n 키 묶음.
 *
 * 같은 인증 API 를 비밀번호 재설정과 회원가입이 함께 쓰는데 화면 문구는 다르다.
 * 그래서 키를 훅에 박지 않고 접두사를 받아 만든다.
 * (auth.passwordReset → auth.passwordReset.error.invalidCode)
 *
 * 분기는 BE ErrorCode 이름(code)으로 한다. 상태코드로는 못 가르는 조합이 많다 —
 * 400 에 코드 불일치·코드 만료가, 429 에 발송 횟수 초과·인증 시도 초과가,
 * 401 에 소셜 계정 안내가 겹쳐 있다. byStatus 는 code 가 없는 응답을 위한
 * 그물로만 남긴다.
 */
function buildErrorKeys(prefix: string) {
  return {
    send: {
      byCode: {
        INVALID_INPUT_VALUE: `${prefix}.error.invalidEmail`,
        // 재설정용 발송 API 전용 — 가입되지 않은 이메일.
        // 회원가입 발송에서는 나오지 않으므로 signUp 쪽 번역 키는 없다.
        USER_NOT_FOUND: `${prefix}.error.emailNotFound`,
        // 회원가입 발송 API 전용 — 이미 가입된 이메일.
        EMAIL_DUPLICATED: `${prefix}.error.duplicateEmail`,
        EMAIL_SEND_LIMIT_EXCEEDED: `${prefix}.error.tooManyRequests`,
        EMAIL_SEND_FAILED: `${prefix}.error.sendFailed`,
        // 재설정용 발송 전용 — 구글로 가입한 이메일은 비밀번호가 아예 없다.
        // (BE PasswordResetService: provider != LOCAL 이면 401)
        SOCIAL_LOGIN_REQUIRED: `${prefix}.error.socialAccount`,
      },
      byStatus: {
        400: `${prefix}.error.invalidEmail`,
        404: `${prefix}.error.emailNotFound`,
        409: `${prefix}.error.duplicateEmail`,
        429: `${prefix}.error.tooManyRequests`,
      },
    } satisfies ErrorKeyTable,
    verify: {
      byCode: {
        VERIFICATION_CODE_MISMATCH: `${prefix}.error.invalidCode`,
        // 코드가 만료됐거나(5분) 시도 초과로 서버가 지웠을 때. 둘 다
        // "다시 발송받아야 한다" 는 같은 안내로 수렴한다.
        VERIFICATION_CODE_EXPIRED: `${prefix}.error.codeExpired`,
        // 5회 실패하면 BE 가 Redis 의 코드를 삭제한다
        // (EmailVerificationService.increaseTryCount). 이후에는 메일에 온
        // 코드가 맞아도 계속 실패하므로 재발송 외에는 방법이 없다.
        // 문구와 함께 step 도 되돌린다 — 아래 CODE_GONE_ERROR_CODES 참고.
        VERIFICATION_ATTEMPT_EXCEEDED: `${prefix}.error.attemptExceeded`,
      },
      byStatus: {
        400: `${prefix}.error.invalidCode`,
        429: `${prefix}.error.attemptExceeded`,
      },
    } satisfies ErrorKeyTable,
    sendFallback: `${prefix}.error.sendFailed`,
    verifyFallback: `${prefix}.error.verifyFailed`,
    /** 인증코드 입력 제한 시간이 지났을 때 */
    expired: `${prefix}.error.codeExpired`,
    /** 인증은 됐지만 그 상태의 유효 시간이 지났을 때 */
    verifiedExpired: `${prefix}.error.verifiedExpired`,
  }
}

/**
 * 인증 완료 상태의 유효 시간(초). BE 확인값 30분.
 *
 * 서버가 "이 이메일은 인증됨"을 들고 있는 시간이다. 이 시간이 지나면
 * 가입·비밀번호 변경 요청이 거부되므로, 프론트도 같이 만료시켜
 * 사용자가 폼을 다 채운 뒤에 실패를 알게 되는 일을 막는다.
 *
 * TODO: 발송 API 의 timeLimit 처럼 서버가 값을 내려주면 그 값을 쓴다.
 */
const VERIFIED_TTL_SEC = 30 * 60

/**
 * "서버에 저장된 인증코드가 더 이상 없다"는 뜻의 에러 코드.
 *
 *   VERIFICATION_ATTEMPT_EXCEEDED  5회 틀리면 BE 가 코드를 지운다
 *                                  (EmailVerificationService.increaseTryCount →
 *                                   redisTemplate.delete(codeKey))
 *   VERIFICATION_CODE_EXPIRED      TTL(서버 timeLimit) 만료로 사라졌다
 *
 * 둘 다 재발송 말고는 진행할 방법이 없으므로 발송 전(IDLE)으로 되돌려야 한다.
 * 문구만 바꾸고 SENT 에 남겨 두면 사용자는 메일에 온 코드가 맞는데도 계속
 * "올바르지 않아요" 만 보게 되고, 재발송 버튼은 두 화면 모두 SENT 동안
 * 감춰져 있어(SignUpPage: hasRequested && !isCodeSent, PasswordResetPage:
 * isEmailLocked) 타이머가 0 이 될 때까지 빠져나갈 방법이 없다.
 */
const CODE_GONE_ERROR_CODES: ReadonlySet<string> = new Set([
  'VERIFICATION_ATTEMPT_EXCEEDED',
  'VERIFICATION_CODE_EXPIRED',
])

function isCodeGone(error: unknown): boolean {
  if (!isAxiosError(error) || !error.response) return false

  const code = (error.response.data as ApiErrorBody | undefined)?.code
  if (code) return CODE_GONE_ERROR_CODES.has(code)

  /*
    code 가 없는 응답(목·프록시 오류 등)은 429 만 신호로 본다.
    400 은 단순 코드 불일치(VERIFICATION_CODE_MISMATCH)와 코드 만료가 겹쳐
    있어서, 되돌리면 오타 한 번에 인증을 처음부터 다시 하게 된다.
  */
  return error.response.status === 429
}

/**
 * ⚠️ 이 두 요청은 반드시 publicApi(인터셉터 없음)로 보낸다.
 *
 * 회원가입·비밀번호 재설정 인증은 전부 비로그인 상태에서 부르는 공개 API 다
 * (BE SecurityConfig 의 /api/v1/users/email/**, /api/v1/users/password/** permitAll).
 * 여기서 오는 401 은 "액세스 토큰 만료"가 아니라 업무 실패다 — 재설정 발송에
 * 구글 가입 이메일을 넣으면 BE 가 401 SOCIAL_LOGIN_REQUIRED 를 준다
 * (PasswordResetService: provider != LOCAL).
 *
 * 이걸 userApi 로 보내면 인터셉터가 401 을 토큰 만료로 보고
 * 재발급 시도 → (비로그인이라) 실패 → redirectToLogin →
 * window.location.href = '/login' 까지 가버린다. 사용자는 아무 안내도 못 보고
 * 입력하던 이메일도 날아간다. 화면이 문구를 띄울 기회 자체가 사라지는 것이다.
 *
 * 같은 이유로 usePasswordReset(실행 단계)도 publicApi 를 쓴다. 셋 다 맞춰 둘 것.
 */

/** 인증 메일 발송. 응답의 timeLimit(초)을 돌려준다. */
async function requestEmailCode(
  path: string,
  body: EmailRequestBody,
): Promise<number> {
  const res = await publicApi.post<ApiResponse<{ timeLimit: number }>>(
    path,
    body,
  )
  return res.data.data.timeLimit
}

/** 인증번호 검증. 성공하면 아무것도 돌려주지 않는다. */
async function verifyEmailCode(
  path: string,
  body: EmailVerifyBody,
): Promise<void> {
  await publicApi.post(path, body)
}

export interface UseEmailVerificationResult {
  step: VerifyStep
  /**
   * 한 번이라도 발송했는지. 버튼 문구를 "인증 발송"/"재발송" 중에 고르는 데 쓴다.
   * step 이 만료로 IDLE 로 되돌아가도 이 값은 유지된다.
   */
  hasRequested: boolean
  /**
   * 남은 초. 만료됐거나 발송 전이면 0.
   *
   * 단계에 따라 무엇이 남은 시간인지 달라진다.
   *   SENT     → 인증코드를 입력할 수 있는 시간 (서버 timeLimit)
   *   VERIFIED → 인증 완료 상태가 유지되는 시간 (30분)
   */
  remainingSec: number
  isSending: boolean
  isVerifying: boolean
  /** 실패 문구의 i18n 키. 없으면 null */
  errorKey: string | null
  sendCode: (body: EmailRequestBody) => Promise<boolean>
  verifyCode: (body: EmailVerifyBody) => Promise<boolean>
}

/**
 * 이메일 인증 (발송 → 인증번호 확인).
 *
 * 남은 시간은 서버가 내려준 timeLimit(초)에서 시작해 1초씩 줄인다.
 * 화면에 5:00 을 하드코딩하지 않는 이유는 BE 가 제한 시간을 바꿔도
 * 프론트를 고치지 않게 하려는 것이다.
 *
 * 0 이 되면 step 을 IDLE 로 되돌려 재발송을 다시 누를 수 있게 한다.
 *
 * @param errorKeyPrefix 실패 문구 i18n 키의 앞부분.
 *   비밀번호 재설정과 회원가입의 문구가 달라 기본값을 두지 않고 화면이 명시한다.
 * @param options.emailRequestPath 인증 메일 발송 엔드포인트.
 *   기본값은 회원가입용(emailRequest). 재설정 화면은 전용 발송 API 를 넘긴다 —
 *   회원가입용은 가입된 이메일에 409 를 반환해 재설정에 쓸 수 없기 때문이다.
 * @param options.emailVerificationPath 인증코드 확인 엔드포인트.
 *   기본값은 회원가입용. 재설정은 확인도 전용 API 다 — BE 가 두 흐름의 인증
 *   상태를 별도 저장소(Redis verify:* / reset:*)에 두므로, 발송만 재설정용을
 *   쓰고 확인을 회원가입용으로 하면 서버가 코드를 찾지 못해 항상 불일치가 난다.
 */
export function useEmailVerification(
  errorKeyPrefix: string,
  options?: { emailRequestPath?: string; emailVerificationPath?: string },
): UseEmailVerificationResult {
  const emailRequestPath =
    options?.emailRequestPath ?? endpoints.users.emailRequest
  const emailVerificationPath =
    options?.emailVerificationPath ?? endpoints.users.emailVerification
  // 매 렌더마다 새 객체를 만들면 아래 useCallback·useEffect 의 의존성이 계속 바뀐다.
  const errorKeys = useMemo(
    () => buildErrorKeys(errorKeyPrefix),
    [errorKeyPrefix],
  )

  const [step, setStep] = useState<VerifyStep>(VERIFY_STEP.IDLE)
  const [hasRequested, setHasRequested] = useState(false)
  const [remainingSec, setRemainingSec] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  /** 만료 시각(ms). 탭이 백그라운드로 갔다 와도 어긋나지 않게 절대 시각으로 잡는다. */
  const expiresAtRef = useRef<number | null>(null)

  // 인증코드 입력 제한 시간과 인증 완료 상태의 유효 시간을 같은 타이머로 센다.
  useEffect(() => {
    if (step !== VERIFY_STEP.SENT && step !== VERIFY_STEP.VERIFIED) return

    const tick = () => {
      const expiresAt = expiresAtRef.current
      if (expiresAt === null) return

      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      setRemainingSec(left)

      // 어느 단계에서 만료됐든 발송 전으로 되돌려 처음부터 다시 인증하게 한다.
      if (left === 0) {
        expiresAtRef.current = null
        setStep(VERIFY_STEP.IDLE)
        setErrorKey(
          step === VERIFY_STEP.VERIFIED
            ? errorKeys.verifiedExpired
            : errorKeys.expired,
        )
      }
    }

    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => {
      window.clearInterval(timerId)
    }
  }, [step, errorKeys])

  const sendCode = useCallback(
    async (body: EmailRequestBody) => {
      setIsSending(true)
      setErrorKey(null)

      try {
        const timeLimitSec = await requestEmailCode(emailRequestPath, body)
        expiresAtRef.current = Date.now() + timeLimitSec * 1000
        setRemainingSec(timeLimitSec)
        setHasRequested(true)
        setStep(VERIFY_STEP.SENT)
        return true
      } catch (error) {
        setErrorKey(toErrorKey(error, errorKeys.send, errorKeys.sendFallback))
        return false
      } finally {
        setIsSending(false)
      }
    },
    [errorKeys, emailRequestPath],
  )

  const verifyCode = useCallback(
    async (body: EmailVerifyBody) => {
      setIsVerifying(true)
      setErrorKey(null)

      try {
        await verifyEmailCode(emailVerificationPath, body)
        // 코드 입력 시간을 끝내고, 인증 완료 상태의 유효 시간으로 갈아탄다.
        expiresAtRef.current = Date.now() + VERIFIED_TTL_SEC * 1000
        setRemainingSec(VERIFIED_TTL_SEC)
        setStep(VERIFY_STEP.VERIFIED)
        return true
      } catch (error) {
        setErrorKey(
          toErrorKey(error, errorKeys.verify, errorKeys.verifyFallback),
        )

        /*
          서버 쪽 코드가 사라졌으면 발송 전으로 되돌려 재발송을 열어 준다.
          타이머 만료 처리(위 useEffect)와 같은 자리로 보내는 것이고,
          errorKey 는 방금 세팅한 값이 그대로 남아 무엇이 잘못됐는지 알려준다.

          step 이 IDLE 이 되면 두 화면 모두 인증코드 칸을 닫고 이메일 칸 아래에
          문구를 보여준다(emailErrorKey 분기). 재발송 버튼 바로 옆이라
          다음에 뭘 해야 하는지가 문구와 같은 자리에 놓인다.

          hasRequested 는 건드리지 않는다 — 버튼 문구가 "인증 발송"으로
          되돌아가면 이미 한 번 보냈다는 사실이 화면에서 지워진다.
        */
        if (isCodeGone(error)) {
          expiresAtRef.current = null
          setRemainingSec(0)
          setStep(VERIFY_STEP.IDLE)
        }
        return false
      } finally {
        setIsVerifying(false)
      }
    },
    [errorKeys, emailVerificationPath],
  )

  return {
    step,
    hasRequested,
    remainingSec,
    isSending,
    isVerifying,
    errorKey,
    sendCode,
    verifyCode,
  }
}
