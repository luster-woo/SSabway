import { cn } from '@/shared/lib/cn'

export interface AppLogoProps {
  /**
   * 로고 한 변의 CSS 길이. 기본값은 기기 폭에 따라 늘어나는 clamp 값이라
   * 320px 소형 기기부터 태블릿까지 그대로 쓸 수 있다.
   */
  size?: string
  className?: string
}

const DEFAULT_SIZE = 'clamp(64px, 19vw, 84px)'

/** 그라디언트 사각형 + 우상단 초록 점으로 구성된 SSabway 심볼 */
export function AppLogo({ size = DEFAULT_SIZE, className }: AppLogoProps) {
  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label="SSabway"
    >
      <div className="bg-brand-gradient flex size-full items-center justify-center rounded-[26%]">
        <span
          className="font-bold leading-none text-white"
          style={{ fontSize: `calc(${size} * 0.52)` }}
        >
          S
        </span>
      </div>
      <span
        className="bg-success absolute rounded-full ring-2 ring-white"
        style={{
          width: `calc(${size} * 0.17)`,
          height: `calc(${size} * 0.17)`,
          right: `calc(${size} * -0.06)`,
          top: `calc(${size} * 0.06)`,
        }}
      />
    </div>
  )
}
