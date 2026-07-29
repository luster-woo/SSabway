import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { ToastContext } from '@/shared/ui/toastContext'

const AUTO_HIDE_MS = 2400

/** 화면 하단에 잠깐 떠오르는 알림. 사용자 플로우 전반에서 공통으로 쓴다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const showToast = useCallback((next: string) => {
    setMessage(next)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setMessage(null), AUTO_HIDE_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-50 flex justify-center px-6"
      >
        {message ? (
          <p className="max-w-[360px] rounded-full bg-[#252c36] px-5 py-3 text-center text-[13.5px] text-white shadow-lg">
            {message}
          </p>
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}
