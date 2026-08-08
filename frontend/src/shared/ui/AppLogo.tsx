import { cn } from '@/shared/lib/cn'
import {
  FULL_BOX,
  LOCKUP_BOX,
  SYMBOL_ACCENT_PATH,
  SYMBOL_BOX,
  SYMBOL_PATH,
  TAGLINE_PATH,
  WORDMARK_PATH,
} from '@/shared/ui/appLogoArt'

export interface AppLogoProps {
  /**
   * 로고의 **가로** 길이. 세로는 도안 비율대로 따라온다.
   * 기본값은 기기 폭에 따라 늘어나는 clamp 값이라 320px 소형 기기부터
   * 태블릿까지 그대로 쓸 수 있다.
   */
  size?: string
  /**
   * 'symbol'   스캔 프레임 심볼만. (기본) 헤더·로딩처럼 이름이 이미
   *            주변 문구로 드러나는 자리에 쓴다.
   * 'wordmark' 심볼 + 'SSABWAY'. 서비스 이름을 로고로 보여주는 시작 페이지용.
   * 'lockup'   심볼 + 'SSABWAY' + 태그라인. 브랜드를 통째로 세우는 랜딩용.
   *
   * 글자가 든 변형은 화면당 하나뿐이다. 다른 곳에서 같이 쓰면 제목 텍스트와
   * 이름이 두 번 나온다.
   */
  variant?: 'symbol' | 'wordmark' | 'lockup'
  /**
   * 'brand'   남색 도안 + 초록 강조. (기본) 밝은 배경용이다.
   * 'inverse' 도안이 흰색으로 반전된다. 어두운 배경(랜딩) 용이다.
   *           도안 안쪽 여백은 비워 두므로 뒤 배경색이 그대로 비친다.
   */
  tone?: 'brand' | 'inverse'
  className?: string
}

const DEFAULT_SIZE = 'clamp(64px, 19vw, 84px)'

const BOX = {
  symbol: SYMBOL_BOX,
  wordmark: FULL_BOX,
  lockup: LOCKUP_BOX,
} as const

/** 도안에 글자가 들어가는 변형인지 — 라벨에 이름을 붙일지 정한다. */
const LABEL = 'SSabway'

/**
 * SSabway 로고.
 *
 * 도안(스캔 프레임 + 승차권 + 경로/핀 + 글자)은 appLogoArt 의 path 를 그대로
 * 쓰고, 여기서는 뷰박스를 골라 변형을 나눈다. 세 변형이 같은 좌표계를 쓰므로
 * 잘라내는 영역만 달라진다.
 *
 * 크기는 가로(size)만 받고 세로는 viewBox 비율로 정해진다. 글자가 붙을수록
 * 세로가 길어지므로 자리에 맞춰 size 를 따로 정해 준다.
 */
export function AppLogo({
  size = DEFAULT_SIZE,
  variant = 'symbol',
  tone = 'brand',
  className,
}: AppLogoProps) {
  const box = BOX[variant]
  const ink = tone === 'inverse' ? '#ffffff' : 'var(--color-logo-ink)'

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      style={{ width: size, height: 'auto' }}
      className={cn('block shrink-0', className)}
      role="img"
      aria-label={LABEL}
      fill="none"
    >
      <path d={SYMBOL_PATH} fillRule="evenodd" fill={ink} />
      <path
        d={SYMBOL_ACCENT_PATH}
        fillRule="evenodd"
        // 초록 강조는 반전에서도 남긴다. 남색 배경 위에서 충분히 밝아
        // 흰 도안과 함께 봐도 대비가 유지되고, 브랜드 색이 사라지지 않는다.
        fill="var(--color-logo-accent)"
      />
      {variant === 'symbol' ? null : (
        <path d={WORDMARK_PATH} fillRule="evenodd" fill={ink} />
      )}
      {variant === 'lockup' ? (
        <path
          d={TAGLINE_PATH}
          fillRule="evenodd"
          fill="var(--color-logo-accent)"
        />
      ) : null}
    </svg>
  )
}
