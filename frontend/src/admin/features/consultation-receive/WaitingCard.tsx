import { cn } from '@/shared/lib/cn'
import {
  toWaitedMinutes,
  type WaitingConsultation,
} from '@/admin/features/consultation-receive/useWaitingConsultations'
import { AdminButton } from '@/admin/ui/AdminButton'
import { Chip } from '@/admin/ui/Chip'

export interface WaitingCardProps {
  consultation: WaitingConsultation
  /** 목록 첫 항목. 다음에 처리할 상담이라 시각적으로 강조한다. */
  isNext?: boolean
  isPending?: boolean
  /**
   * 마이크가 차단되어 수락할 수 없다.
   *
   * 눌러도 발행이 실패할 것이 이미 확실하므로 버튼을 잠근다. 사유는 목록 위
   * 안내가 설명한다(WaitingPanel) — 카드마다 반복하면 목록이 읽히지 않는다.
   */
  isMicBlocked?: boolean
  onAccept: (consultationId: number) => void
}

/** 상담 대기 목록의 한 항목. */
export function WaitingCard({
  consultation,
  isNext = false,
  isPending = false,
  isMicBlocked = false,
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

      <AdminButton
        variant={isNext ? 'primary' : 'secondary'}
        className="shrink-0 rounded-full px-6"
        disabled={isPending || isMicBlocked}
        onClick={() => onAccept(consultationId)}
      >
        {isPending ? '연결 중…' : isMicBlocked ? '마이크 필요' : '상담 연결'}
      </AdminButton>
    </li>
  )
}
