import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui'
import {
  toWaitedMinutes,
  type WaitingConsultation,
} from '@/admin/features/consultation-receive/useWaitingConsultations'
import { Chip } from '@/admin/ui/Chip'

export interface WaitingCardProps {
  consultation: WaitingConsultation
  /** 목록 첫 항목. 다음에 처리할 상담이라 시각적으로 강조한다. */
  isNext?: boolean
  isPending?: boolean
  onAccept: (consultationId: number) => void
}

/** 상담 대기 목록의 한 항목. */
export function WaitingCard({
  consultation,
  isNext = false,
  isPending = false,
  onAccept,
}: WaitingCardProps) {
  const { consultationId, email, startPoint, finalPoint, langCode } =
    consultation

  return (
    <li
      className={cn(
        'flex items-center gap-4 rounded-2xl border px-5 py-4',
        isNext ? 'border-brand bg-brand-soft/40' : 'border-line bg-surface',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-[15px] font-bold">{email}</p>
        <p className="text-ink-muted mt-1.5 truncate text-[13px]">
          출발 {startPoint} → 도착 {finalPoint}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2">
        <Chip tone="warning">
          대기 {toWaitedMinutes(consultation.requestedAt)}분
        </Chip>
        <Chip tone="info">{langCode}</Chip>
      </div>

      <Button
        variant={isNext ? 'primary' : 'secondary'}
        className="shrink-0 rounded-full px-6"
        disabled={isPending}
        onClick={() => onAccept(consultationId)}
      >
        {isPending ? '연결 중…' : '상담 연결'}
      </Button>
    </li>
  )
}
