import { useTranslation } from 'react-i18next'

export interface GuideInstructionCardProps {
  /** 이번 단계에서 해야 할 행동 */
  instruction: string
}

/** 이번 단계 지시문. 위쪽 띠는 '경로 안내'라는 것을 알려주는 라벨이다. */
export function GuideInstructionCard({
  instruction,
}: GuideInstructionCardProps) {
  const { t } = useTranslation()

  return (
    <div className="border-line bg-surface overflow-hidden rounded-[20px] border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="bg-brand-gradient px-4 py-2.5 text-[11.5px] font-bold text-white">
        {t('routeGuide.label')}
      </p>

      {/*
        지시문은 화면에서 가장 먼저 읽혀야 하는 정보다.
        높이는 항상 3줄로 고정한다 — 짧으면 래퍼의 min-h 로 3줄 공간을 확보해
        그 안에서 세로 중앙에 두고(문장 자체는 왼쪽 정렬 유지),
        세 줄을 넘으면 line-clamp-3 로 … 처리해 단계마다 카드 높이가 흔들리지
        않게 한다. 4.125em = 3줄(leading-snug 1.375 × 3), em 이라 유동 폰트에
        비례해 어떤 화면에서도 정확히 세 줄이다.

        ⚠️ 패딩은 이 래퍼(div)에 둔다 — line-clamp 요소에 하단 패딩을 주면
        그 패딩 영역으로 다음 줄이 비쳐 카드 밖으로 새어 나온다.
      */}
      <div className="flex min-h-[4.125em] flex-col justify-center px-4 py-4">
        <p
          aria-live="polite"
          className="text-ink line-clamp-3 text-[clamp(14px,4.3vw,16px)] leading-snug font-bold"
        >
          {instruction}
        </p>
      </div>
    </div>
  )
}
