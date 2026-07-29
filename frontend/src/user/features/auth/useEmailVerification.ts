import { useCallback, useEffect, useRef, useState } from 'react'

import type { Language } from '@/shared/types/user'
import {
  MockHttpError,
  toErrorKey,
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
 * 프로토타입에는 6자리로 적혀 있지만 명세를 따랐다.
 */
export const CODE_LENGTH = 7

/**
 * 영문·숫자만 남기고 길이를 자른다.
 *
 * 서버는 대소문자를 구분하지 않으므로 입력한 대소문자를 그대로 둔다.
 * 화면에서 강제로 대문자로 바꾸면 소문자 코드를 받은 사용자가
 * "내가 받은 것과 다른 값이 찍힌다"고 느끼게 된다.
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

/** 명세에 적힌 상태코드를 그대로 옮겼다. */
const SEND_ERROR_KEY: Record<number, string> = {
  400: 'auth.passwordReset.error.invalidEmail',
  409: 'auth.passwordReset.error.duplicateEmail',
  429: 'auth.passwordReset.error.tooManyRequests',
}

const VERIFY_ERROR_KEY: Record<number, string> = {
  400: 'auth.passwordReset.error.invalidCode',
}

const FALLBACK_SEND_ERROR_KEY = 'auth.passwordReset.error.sendFailed'
const FALLBACK_VERIFY_ERROR_KEY = 'auth.passwordReset.error.verifyFailed'

/* ------------------------------------------------------------------ *
 * 목 처리. BE 연동 시 이 블록만 지우고 아래 TODO 의 호출로 교체한다.
 * ------------------------------------------------------------------ */

/** 명세 응답의 timeLimit 기본값(초). 실제로는 서버가 내려준 값을 쓴다. */
const MOCK_TIME_LIMIT_SEC = 300
const MOCK_LATENCY_MS = 600
/**
 * 이 코드만 통과시킨다. 명세 예시값(영문+숫자 7자리)을 그대로 썼다.
 * 비교는 대소문자를 구분하지 않는다 (BE 확인).
 */
const MOCK_CODE = 'A7KM3PQ'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** 인증 메일 발송. 응답의 timeLimit(초)을 돌려준다. */
async function requestEmailCode(body: EmailRequestBody): Promise<number> {
  // TODO: BE 연동 시 아래 목 처리를 실제 호출로 교체.
  //   const res = await userApi.post<ApiResponse<{ timeLimit: number }>>(
  //     endpoints.users.emailRequest, body,
  //   )
  //   return res.data.data.timeLimit
  await delay(MOCK_LATENCY_MS)

  if (!body.email.includes('@')) throw new MockHttpError(400)

  return MOCK_TIME_LIMIT_SEC
}

/** 인증번호 검증. 성공하면 아무것도 돌려주지 않는다. */
async function verifyEmailCode(body: EmailVerifyBody): Promise<void> {
  // TODO: BE 연동 시 실제 호출로 교체.
  //   await userApi.post(endpoints.users.emailVerification, body)
  await delay(MOCK_LATENCY_MS)

  const isValid =
    normalizeCode(body.code).toUpperCase() === MOCK_CODE.toUpperCase()
  if (!isValid) throw new MockHttpError(400)
}

/* ------------------------------------------------------------------ */

export interface UseEmailVerificationResult {
  step: VerifyStep
  /**
   * 한 번이라도 발송했는지. 버튼 문구를 "인증 발송"/"재발송" 중에 고르는 데 쓴다.
   * step 이 만료로 IDLE 로 되돌아가도 이 값은 유지된다.
   */
  hasRequested: boolean
  /** 인증 발송 후 남은 초. 발송 전이거나 만료됐으면 0 */
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
 */
export function useEmailVerification(): UseEmailVerificationResult {
  const [step, setStep] = useState<VerifyStep>(VERIFY_STEP.IDLE)
  const [hasRequested, setHasRequested] = useState(false)
  const [remainingSec, setRemainingSec] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  /** 만료 시각(ms). 탭이 백그라운드로 갔다 와도 어긋나지 않게 절대 시각으로 잡는다. */
  const expiresAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (step !== VERIFY_STEP.SENT) return

    const tick = () => {
      const expiresAt = expiresAtRef.current
      if (expiresAt === null) return

      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      setRemainingSec(left)

      // 만료되면 발송 전으로 되돌려 재발송을 허용한다.
      if (left === 0) {
        expiresAtRef.current = null
        setStep(VERIFY_STEP.IDLE)
        setErrorKey('auth.passwordReset.error.codeExpired')
      }
    }

    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => {
      window.clearInterval(timerId)
    }
  }, [step])

  const sendCode = useCallback(async (body: EmailRequestBody) => {
    setIsSending(true)
    setErrorKey(null)

    try {
      const timeLimitSec = await requestEmailCode(body)
      expiresAtRef.current = Date.now() + timeLimitSec * 1000
      setRemainingSec(timeLimitSec)
      setHasRequested(true)
      setStep(VERIFY_STEP.SENT)
      return true
    } catch (error) {
      setErrorKey(toErrorKey(error, SEND_ERROR_KEY, FALLBACK_SEND_ERROR_KEY))
      return false
    } finally {
      setIsSending(false)
    }
  }, [])

  const verifyCode = useCallback(async (body: EmailVerifyBody) => {
    setIsVerifying(true)
    setErrorKey(null)

    try {
      await verifyEmailCode(body)
      expiresAtRef.current = null
      setRemainingSec(0)
      setStep(VERIFY_STEP.VERIFIED)
      return true
    } catch (error) {
      setErrorKey(
        toErrorKey(error, VERIFY_ERROR_KEY, FALLBACK_VERIFY_ERROR_KEY),
      )
      return false
    } finally {
      setIsVerifying(false)
    }
  }, [])

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
