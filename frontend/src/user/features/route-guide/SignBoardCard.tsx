import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import {
  SIGN_DIRECTION,
  type GuideSign,
  type SignDirection,
} from '@/shared/types/routeGuide'
import { ArrowUpIcon } from '@/user/features/route-guide/icons'

/**
 * 방향별 화살표 회전값. 위쪽 화살표 하나를 돌려 다섯 방향을 만든다.
 * 실제 역 표지판이 직진과 상행을 모두 ↑로 표기하므로 두 값이 같다.
 */
const ARROW_ROTATION: Record<SignDirection, string> = {
  [SIGN_DIRECTION.STRAIGHT]: 'rotate-0',
  [SIGN_DIRECTION.UP]: 'rotate-0',
  [SIGN_DIRECTION.RIGHT]: 'rotate-90',
  [SIGN_DIRECTION.DOWN]: 'rotate-180',
  [SIGN_DIRECTION.LEFT]: '-rotate-90',
}

export interface SignBoardCardProps {
  sign: GuideSign
}

/**
 * 다음에 찾아야 할 표지판 한 장.
 *
 * BE가 실사 사진(photoUrl)을 내려주면 사진을 그대로 보여주고,
 * 아직 사진이 없는 지점은 같은 규격으로 표지판을 그려 대체한다.
 * 색은 실제 역 표지판(감청 바탕 · 노란 출구 블록)을 따른다.
 */
export function SignBoardCard({ sign }: SignBoardCardProps) {
  const { t } = useTranslation()

  if (sign.photoUrl) {
    return (
      <img
        src={sign.photoUrl}
        alt={`${sign.title} · ${sign.subtitle}`}
        className="bg-sign h-[clamp(150px,46vw,176px)] w-full rounded-xl object-cover"
      />
    )
  }

  return (
    <div className="bg-sign flex h-[clamp(150px,46vw,176px)] items-stretch overflow-hidden rounded-xl">
      {sign.exitNumber ? (
        <div className="bg-sign-exit text-sign flex w-[clamp(88px,26vw,100px)] shrink-0 flex-col items-center justify-center gap-1">
          <span className="text-[clamp(30px,9vw,34px)] leading-none font-extrabold">
            {sign.exitNumber}
          </span>
          <span className="text-[13px] font-bold">{t('routeGuide.exit')}</span>
          <span className="text-[11px]">Exit</span>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 items-stretch gap-3 px-4">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="text-[clamp(17px,5.2vw,20px)] leading-tight font-extrabold text-white">
            {sign.title}
          </p>
          <p className="text-sign-sub mt-1.5 text-[12px]">{sign.subtitle}</p>
        </div>

        {/* 노선 뱃지는 위, 진행 방향 화살표는 아래 — 실제 표지판 배치를 따른다. */}
        <div className="flex shrink-0 flex-col items-center justify-between py-3.5">
          {sign.lineBadge ? (
            <span
              className="flex size-7 items-center justify-center rounded-full text-[16px] leading-none font-extrabold text-white"
              style={{ backgroundColor: sign.lineBadge.color }}
            >
              {sign.lineBadge.label}
            </span>
          ) : (
            <span aria-hidden className="size-7" />
          )}

          <ArrowUpIcon
            aria-hidden
            className={cn(
              'size-6 text-white transition-transform',
              ARROW_ROTATION[sign.direction],
            )}
          />
        </div>
      </div>
    </div>
  )
}
