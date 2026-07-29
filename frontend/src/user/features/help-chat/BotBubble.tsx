import type { ReactNode } from 'react'

export interface BotBubbleProps {
  children: ReactNode
}

/** 도우미(봇) 말풍선. 왼쪽 정렬, 줄바꿈(\n)을 그대로 살린다. */
export function BotBubble({ children }: BotBubbleProps) {
  return (
    <div className="border-line bg-surface text-ink max-w-[82%] self-start rounded-[16px] border px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-line">
      {children}
    </div>
  )
}
