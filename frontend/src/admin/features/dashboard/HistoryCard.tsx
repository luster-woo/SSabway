import { Button } from '@/shared/ui'
import type { ConsultationHistory } from '@/admin/features/dashboard/useConsultationHistory'

export interface HistoryCardProps {
  history: ConsultationHistory
  /** 블랙리스트 요청 중 */
  isPending?: boolean
  /** 원본 기록 조회 중 */
  isRecordPending?: boolean
  onViewOriginal: (consultationId: number) => void
  onRegisterBlacklist: (email: string) => void
  onReleaseBlacklist: (email: string) => void
}

/** "07/17 · 10:20 ~ 10:32" 형태. 연·초는 목록에서 불필요해 생략한다. */
function formatPeriod(startTime: string, endTime: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)

  const pad = (value: number) => String(value).padStart(2, '0')
  const date = `${pad(start.getMonth() + 1)}/${pad(start.getDate())}`
  const from = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const to = `${pad(end.getHours())}:${pad(end.getMinutes())}`

  return `${date} · ${from} ~ ${to}`
}

/** 민원 기록 목록의 한 항목. */
export function HistoryCard({
  history,
  isPending = false,
  isRecordPending = false,
  onViewOriginal,
  onRegisterBlacklist,
  onReleaseBlacklist,
}: HistoryCardProps) {
  const { consultationId, userEmail, summary, startTime, endTime, isBlack } =
    history

  return (
    <li className="bg-surface-muted flex items-start gap-4 rounded-2xl px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-ink text-[14px] font-bold">
          {formatPeriod(startTime, endTime)}
        </p>
        <p className="text-ink-muted mt-1.5 truncate text-[13px]">
          {userEmail}
        </p>
        <p className="text-ink-muted mt-2 text-[13px]">AI 요약 · {summary}</p>
      </div>

      <div className="flex w-[150px] shrink-0 flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full"
          disabled={isRecordPending}
          onClick={() => onViewOriginal(consultationId)}
        >
          {isRecordPending ? '불러오는 중…' : '원본 기록 보기'}
        </Button>

        {isBlack ? (
          <Button
            size="sm"
            className="bg-danger rounded-full font-bold text-white"
            disabled={isPending}
            onClick={() => onReleaseBlacklist(userEmail)}
          >
            {isPending ? '처리 중…' : '차단됨 · 해제'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="border-danger text-danger rounded-full font-bold"
            disabled={isPending}
            onClick={() => onRegisterBlacklist(userEmail)}
          >
            {isPending ? '처리 중…' : '블랙리스트 등록'}
          </Button>
        )}
      </div>
    </li>
  )
}
