import { cn } from '@/shared/lib/cn'

export interface StepDotsProps {
  /** 0부터 시작하는 현재 위치 */
  activeIndex: number
  count: number
  /** 스크린리더용 문구 ("질문 2 / 4") */
  label: string
}

/** 질문 진행 표시. 지나간 질문도 회색으로 두어 현재 위치만 드러낸다. */
export function StepDots({ activeIndex, count, label }: StepDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            'size-[7px] rounded-full transition-colors',
            index === activeIndex ? 'bg-brand' : 'bg-line',
          )}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
