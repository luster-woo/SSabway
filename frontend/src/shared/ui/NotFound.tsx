import type { ReactNode } from 'react'

export interface NotFoundProps {
  title: string
  description: string
  /** 돌아갈 곳으로 이동하는 버튼. 레이어마다 버튼 컴포넌트가 달라 노드로 받는다. */
  action: ReactNode
}

/**
 * 404 안내 본문.
 *
 * 감싸는 레이아웃은 호출부가 정한다. 사용자는 폰 화면(MobileScreen),
 * 관리자는 넓은 화면(AdminShell)이라 바깥 틀을 공유할 수 없다.
 * 문구도 사용자는 4개 언어, 관리자는 한국어 고정이라 여기서 번역하지 않는다.
 */
export function NotFound({ title, description, action }: NotFoundProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p
        aria-hidden
        className="text-brand-soft text-[clamp(56px,18vw,84px)] leading-none font-bold"
      >
        404
      </p>

      <h1 className="text-ink mt-2 text-[clamp(18px,5vw,22px)] font-bold">
        {title}
      </h1>
      <p className="text-ink-muted text-[clamp(13px,3.8vw,14px)] leading-6">
        {description}
      </p>

      <div className="mt-6 w-full max-w-[280px]">{action}</div>
    </div>
  )
}
