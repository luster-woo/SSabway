import { cn } from '@/shared/lib/cn'
import { AdminButton } from '@/admin/ui/AdminButton'
import { Modal } from '@/admin/ui/Modal'

export interface ConsultationRecordModalProps {
  userEmail: string
  summary: string
  /** GET /admins/consultations 의 S3_path */
  recordUrl: string
  onClose: () => void
}

/**
 * 원본 상담 내역.
 *
 * 응답이 녹취 S3 경로 하나뿐이라 오디오 플레이어와 원본 링크를 함께 보여준다.
 * AI 요약은 이미 목록에서 받은 값을 그대로 쓴다.
 */
export function ConsultationRecordModal({
  userEmail,
  summary,
  recordUrl,
  onClose,
}: ConsultationRecordModalProps) {
  return (
    <Modal title="원본 상담 내역" onClose={onClose}>
      <p className="text-ink-muted text-[13px]">
        <span className="text-ink font-bold">{userEmail}</span> 님과의 상담
        녹취입니다.
      </p>

      <div className="bg-surface-muted mt-4 rounded-2xl px-4 py-3">
        <p className="text-ink-muted text-[12.5px] font-bold">AI 요약</p>
        <p className="text-ink mt-1.5 text-[13px]">{summary}</p>
      </div>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- 녹취 음성이라 자막 트랙이 없다 */}
      <audio className="mt-5 w-full" controls src={recordUrl} />

      <div className="mt-6 flex gap-2">
        <a
          href={recordUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'border-line text-ink inline-flex h-11 flex-1 items-center justify-center',
            'rounded-2xl border text-sm font-bold whitespace-nowrap',
          )}
        >
          원본 열기
        </a>
        <AdminButton size="lg" className="flex-1" onClick={onClose}>
          닫기
        </AdminButton>
      </div>
    </Modal>
  )
}
