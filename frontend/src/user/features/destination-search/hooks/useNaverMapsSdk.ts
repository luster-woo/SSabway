import { useCallback, useEffect, useRef, useState } from 'react'

import {
  LOAD_ERROR,
  loadNaverMaps,
  NaverMapsLoadError,
  onNaverMapsAuthFailure,
  type LoadErrorType,
} from '@/user/features/destination-search/lib/loadNaverMaps'

export const SDK_STATUS = {
  LOADING: 'LOADING',
  READY: 'READY',
  ERROR: 'ERROR',
} as const
export type SdkStatus = (typeof SDK_STATUS)[keyof typeof SDK_STATUS]

export interface UseNaverMapsSdkResult {
  status: SdkStatus
  errorType: LoadErrorType | null
  retry: () => void
}

/** 네이버 지도 SDK 로딩 상태를 컴포넌트에서 다루기 쉽게 감싼 훅. */
export function useNaverMapsSdk(): UseNaverMapsSdkResult {
  const [status, setStatus] = useState<SdkStatus>(SDK_STATUS.LOADING)
  const [errorType, setErrorType] = useState<LoadErrorType | null>(null)
  // 언마운트 이후 늦게 resolve된 프라미스가 setState를 호출하지 않도록 막는다.
  const aliveRef = useRef(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // attempt는 값이 아니라 "재시도 트리거"로만 쓴다. 참조해야 dep이 유효하다.
    void attempt
    aliveRef.current = true
    setStatus(SDK_STATUS.LOADING)
    setErrorType(null)

    // 인증 실패는 load 이벤트 뒤에 별도 콜백으로 오므로 따로 구독한다.
    const unsubscribe = onNaverMapsAuthFailure(() => {
      if (!aliveRef.current) return
      setErrorType(LOAD_ERROR.AUTH_FAILED)
      setStatus(SDK_STATUS.ERROR)
    })

    loadNaverMaps()
      .then(() => {
        if (!aliveRef.current) return
        setStatus(SDK_STATUS.READY)
      })
      .catch((error: unknown) => {
        if (!aliveRef.current) return
        setErrorType(
          error instanceof NaverMapsLoadError
            ? error.reason
            : LOAD_ERROR.SCRIPT_ERROR,
        )
        setStatus(SDK_STATUS.ERROR)
      })

    return () => {
      aliveRef.current = false
      unsubscribe()
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((prev) => prev + 1), [])

  return { status, errorType, retry }
}
