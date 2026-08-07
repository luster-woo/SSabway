import { createContext, useContext } from 'react'

export interface ToastOptions {
  /** 배경 알약 없이 굵고 크게 표시한다. 밝은 화면에서 강조할 때 쓴다. */
  plain?: boolean
}

export interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
