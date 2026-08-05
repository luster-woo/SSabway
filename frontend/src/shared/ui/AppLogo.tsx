import { cn } from '@/shared/lib/cn'

export interface AppLogoProps {
  /**
   * 로고 한 변의 CSS 길이. 기본값은 기기 폭에 따라 늘어나는 clamp 값이라
   * 320px 소형 기기부터 태블릿까지 그대로 쓸 수 있다.
   */
  size?: string
  /**
   * 'gradient' 브랜드 그라디언트 사각형 + 흰 S. (기본)
   * 'inverse'  흰 사각형 + 현재 글자색의 S. 어두운 배경(랜딩) 용이다.
   *            S 색은 상속되므로 감싸는 쪽에서 text-* 로 정한다.
   */
  variant?: 'gradient' | 'inverse'
  className?: string
}

const DEFAULT_SIZE = 'clamp(64px, 19vw, 84px)'

/** 그라디언트 사각형 + 우상단 초록 점으로 구성된 SSabway 심볼 */
export function AppLogo({
  size = DEFAULT_SIZE,
  variant = 'gradient',
  className,
}: AppLogoProps) {
  const inverse = variant === 'inverse'

  return (
    <div
      className={cn('relative shrink-0', inverse && 'text-landing', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label="SSabway"
    >
      <div
        className={cn(
          'flex size-full items-center justify-center rounded-[26%]',
          inverse ? 'bg-white' : 'bg-brand-gradient',
        )}
      >
        <span
          className={cn(
            'leading-none font-bold',
            inverse ? 'text-current' : 'text-white',
          )}
          style={{ fontSize: `calc(${size} * 0.52)` }}
        >
          S
        </span>
      </div>
      <span
        className={cn(
          'bg-success absolute rounded-full',
          // 반전 변형은 흰 사각형 위라 흰 링이 보이지 않는다. 링 없이 둔다.
          !inverse && 'ring-2 ring-white',
        )}
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
