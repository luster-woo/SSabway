import { AdminButton } from '@/admin/ui/AdminButton'
import { Modal } from '@/admin/ui/Modal'

export interface EndConsultationDialogProps {
  isPending?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * 상담 종료 확인.
 *
 * 되돌릴 수 없어서 확인을 받는다. 수락은 상담당 1회만 성공하고(409 ALREADY_ACCEPTED)
 * 역무원용 토큰 재발급 API 가 없으므로 종료하면 이 상담으로 돌아올 수 없다.
 */
export function EndConsultationDialog({
  isPending = false,
  onConfirm,
  onClose,
}: EndConsultationDialogProps) {
  return (
    <Modal title="상담을 종료할까요?" onClose={onClose}>
      <p className="text-ink-muted text-[13px]">
        종료하면 다시 연결할 수 없어요
      </p>

      <div className="mt-7 flex gap-2">
        <AdminButton
          size="lg"
          className="flex-1"
          disabled={isPending}
          onClick={onConfirm}
        >
          {isPending ? '종료 중…' : '종료'}
        </AdminButton>
        <AdminButton
          variant="secondary"
          size="lg"
          className="flex-1"
          disabled={isPending}
          onClick={onClose}
        >
          계속하기
        </AdminButton>
      </div>
    </Modal>
  )
}
