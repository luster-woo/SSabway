import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types/api'
import type { Language } from '@/shared/types/user'
import { toErrorKey } from '@/user/features/auth/lib/mockHttpError'

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
 * 실패 문구의 i18n 키 묶음. 상태코드는 명세에 적힌 것을 그대로 옮겼다.
 *
 * 같은 인증 API 를 비밀번호 재설정과 회원가입이 함께 쓰는데 화면 문구는 다르다.
 * 그래서 키를 훅에 박지 않고 접두사를 받아 만든다.
 * (auth.passwordReset → auth.passwordReset.error.invalidCode)
 */
function buildErrorKeys(prefix: string) {
  return {
    send: {
      400: `${prefix}.error.invalidEmail`,
      // 404: 재설정용 발송 API 전용 — 가입되지 않은 이메일.
      //      회원가입 발송에서는 나오지 않으므로 signUp 쪽 번역 키는 없다.
      404: `${prefix}.error.emailNotFound`,
      // 409: 회원가입 발송 API 전용 — 이미 가입된 이메일.
      409: `${prefix}.error.duplicateEmail`,
      429: `${prefix}.error.tooManyRequests`,
    } as Record<number, string>,
    verify: {
      400: `${prefix}.error.invalidCode`,
    } as Record<number, string>,
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

/** 인증 메일 발송. 응답의 timeLimit(초)을 돌려준다. */
async function requestEmailCode(
  path: string,
  body: EmailRequestBody,
): Promise<number> {
  const res = await userApi.post<ApiResponse<{ timeLimit: number }>>(path, body)
  return res.data.data.timeLimit
}

/** 인증번호 검증. 성공하면 아무것도 돌려주지 않는다. */
async function verifyEmailCode(
  path: string,
  body: EmailVerifyBody,
): Promise<void> {
  await userApi.post(path, body)
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
