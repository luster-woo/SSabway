import { useTranslation } from 'react-i18next'

import type { ArrivalSummary } from '@/user/features/arrival/lib/mockArrivalSummary'

interface SummaryRowProps {
  label: string
  value: string
}

/** 라벨은 왼쪽에 흐리게, 값은 오른쪽에 굵게 — 프로토타입 표 형태를 따른다. */
function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="text-ink-muted shrink-0 text-[13px]">{label}</dt>
      <dd className="text-ink text-right text-[14.5px] font-bold">{value}</dd>
    </div>
  )
}

export interface ArrivalSummaryCardProps {
  summary: ArrivalSummary
}

/** 이번 이동 요약 — 소요 시간 · 출발지 · 도착지 */
export function ArrivalSummaryCard({ summary }: ArrivalSummaryCardProps) {
  const { t } = useTranslation()

  return (
    <dl className="divide-line bg-surface-soft flex flex-col divide-y rounded-[20px] px-5 py-1.5">
      <SummaryRow label={t('arrival.duration')} value={summary.duration} />
      <SummaryRow label={t('arrival.origin')} value={summary.originName} />
      <SummaryRow
        label={t('arrival.destination')}
        value={summary.destinationName}
      />
    </dl>
  )
}
