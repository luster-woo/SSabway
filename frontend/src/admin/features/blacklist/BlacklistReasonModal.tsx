import { useState, type FormEvent } from 'react'

import { cn } from '@/shared/lib/cn'
import {
  BLACKLIST_REASONS,
  joinReasons,
  type BlacklistReason,
} from '@/admin/features/blacklist/blacklistReasons'
import { AdminButton } from '@/admin/ui/AdminButton'
import { Modal } from '@/admin/ui/Modal'

export interface BlacklistReasonModalProps {
  userEmail: string
  /** 수정 모드에서 미리 선택해둘 사유 */
  initialReasons?: readonly BlacklistReason[]
  isEditMode?: boolean
  isPending?: boolean
  /** 선택한 사유를 API 의 reason 문자열로 합쳐서 넘긴다. */
  onSubmit: (reason: string) => void
  onClose: () => void
}

/** 첫 줄에 놓을 개수. 프로토타입과 같은 2 / 3 배치를 유지한다. */
const FIRST_ROW_COUNT = 2

const REASON_ROWS: readonly (readonly BlacklistReason[])[] = [
  BLACKLIST_REASONS.slice(0, FIRST_ROW_COUNT),
  BLACKLIST_REASONS.slice(FIRST_ROW_COUNT),
]

interface ReasonChipProps {
  reason: BlacklistReason
  isSelected: boolean
  onToggle: (reason: BlacklistReason) => void
}

function ReasonChip({ reason, isSelected, onToggle }: ReasonChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onToggle(reason)}
      className={cn(
        'rounded-full border px-4 py-2 text-[13px] font-bold transition',
        'focus-visible:ring-brand focus-visible:ring-2 focus-visible:outline-none',
        isSelected
          ? 'border-danger bg-danger text-white'
          : 'border-line text-ink-muted bg-surface',
      )}
    >
      {reason}
    </button>
  )
}

/**
 * 위반 사유 선택 (등록 · 수정 공용).
 *
 * 고정 목록에서 여러 개 고를 수 있고 최소 한 개는 골라야 한다.
 * API 의 reason 은 문자열 하나라 선택 결과를 콤마로 이어 보낸다.
 */
export function BlacklistReasonModal({
  userEmail,
  initialReasons = [],
  isEditMode = false,
  isPending = false,
  onSubmit,
  onClose,
}: BlacklistReasonModalProps) {
  const [selected, setSelected] = useState<BlacklistReason[]>([
    ...initialReasons,
  ])

  const isSubmittable = selected.length > 0 && !isPending

  const toggleReason = (reason: BlacklistReason) => {
    setSelected((prev) =>
      prev.includes(reason)
        ? prev.filter((item) => item !== reason)
        : [...prev, reason],
    )
  }

  const submitReasons = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSubmittable) return
    onSubmit(joinReasons(selected))
  }

  return (
    <Modal
      title={isEditMode ? '차단 사유 수정' : '블랙리스트 등록'}
      onClose={onClose}
    >
      <form onSubmit={submitReasons} noValidate>
        <p className="text-ink-muted text-[13px]">
          <span className="text-ink font-bold">{userEmail}</span> ·{' '}
          {isEditMode ? '위반 사유를 수정하세요' : '위반 사유를 선택하세요'}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {REASON_ROWS.map((row) => (
            <div key={row[0]} className="flex justify-center gap-2">
              {row.map((reason) => (
                <ReasonChip
                  key={reason}
                  reason={reason}
                  isSelected={selected.includes(reason)}
                  onToggle={toggleReason}
                />
              ))}
            </div>
          ))}
        </div>

        {selected.length === 0 ? (
          <p className="text-ink-muted mt-4 text-[12.5px]">
            사유를 하나 이상 선택해 주세요.
          </p>
        ) : null}

        <div className="mt-7 flex gap-2">
          <AdminButton
            variant="secondary"
            size="lg"
            className="flex-1"
            disabled={isPending}
            onClick={onClose}
          >
            취소
          </AdminButton>
          <AdminButton
            type="submit"
            variant="danger"
            size="lg"
            className="flex-1"
            disabled={!isSubmittable}
          >
            {isPending ? '처리 중…' : isEditMode ? '저장' : '등록'}
          </AdminButton>
        </div>
      </form>
    </Modal>
  )
}
