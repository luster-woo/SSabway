import type { ConsultationHistory } from '@/admin/features/dashboard/useConsultationHistory'
import { AdminButton } from '@/admin/ui/AdminButton'

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

/**
 * "07/17 · 10:20 ~ 10:32" 형태. 연·초는 목록에서 불필요해 생략한다.
 *
 * 서버는 status = ENDED 인 상담만 주므로 두 시각이 다 채워져 있는 게 정상이다.
 * 다만 DB 의 started_at·ended_at 은 NULL 허용 컬럼이라 값이 빌 수 있다.
 *
 * ⚠️ null 검사를 Date 생성 전에 해야 한다. new Date(null) 은 Invalid Date 가
 *    아니라 1970-01-01(=0ms) 이라서, getTime() 이 NaN 이 아니고 "01/01 · 09:00"
 *    처럼 그럴듯한 거짓 시각이 그대로 표시된다. 파싱 실패(Invalid Date)는
 *    그 뒤에 따로 걸러 낸다.
 */
function formatPeriod(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '시간 정보 없음'

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '시간 정보 없음'
  }

  const pad = (value: number) => String(value).padStart(2, '0')
  const date = `${pad(start.getMonth() + 1)}/${pad(start.getDate())}`
  const from = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const to = `${pad(end.getHours())}:${pad(end.getMinutes())}`

  return `${date}  ${from} ~ ${to}`
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
        <p className="text-ink-muted mt-2 text-left text-[13px]">
          {summary ?? '요약 없음'}
        </p>
      </div>

      <div className="flex w-[150px] shrink-0 flex-col gap-2">
        <AdminButton
          variant="secondary"
          size="sm"
          className="rounded-full"
          disabled={isRecordPending}
          onClick={() => onViewOriginal(consultationId)}
        >
          {isRecordPending ? '불러오는 중…' : '원본 기록 보기'}
        </AdminButton>

        {isBlack ? (
          <AdminButton
            variant="danger"
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={() => onReleaseBlacklist(userEmail)}
          >
            {isPending ? '처리 중…' : '차단됨 · 해제'}
          </AdminButton>
        ) : (
          <AdminButton
            variant="dangerOutline"
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={() => onRegisterBlacklist(userEmail)}
          >
            {isPending ? '처리 중…' : '블랙리스트 등록'}
          </AdminButton>
        )}
      </div>
    </li>
  )
}
