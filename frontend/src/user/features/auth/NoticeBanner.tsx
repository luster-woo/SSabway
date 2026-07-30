import type { ReactNode } from 'react'

export interface NoticeBannerProps {
  children: ReactNode
}

/**
 * 안내 배너. 프로토타입 7-2 의 "인증 메일을 보냈어요" 줄이다.
 *
 * 오류가 아니라 진행 안내라 danger 색을 쓰지 않는다.
 * 화면에 새로 나타나는 안내라 aria-live 로 스크린리더에도 읽히게 한다.
 */
export function NoticeBanner({ children }: NoticeBannerProps) {
  return (
    <p
      aria-live="polite"
      className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-[12.5px] font-bold text-amber-700"
    >
      {children}
    </p>
  )
}
