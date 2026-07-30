import { useBlacklistRoster } from '@/admin/features/blacklist/useBlacklist'
import { AdminButton } from '@/admin/ui/AdminButton'
import { Modal } from '@/admin/ui/Modal'

export interface BlacklistRosterModalProps {
  /** 요청 중인 사용자 이메일. 해당 행만 버튼을 비활성화한다. */
  pendingEmail?: string | null
  onEditReason: (userEmail: string, reason: string) => void
  onRelease: (userEmail: string) => void
  onClose: () => void
}

/** 블랙리스트 명단. 차단된 사용자와 사유를 보고 수정·해제한다. */
export function BlacklistRosterModal({
  pendingEmail = null,
  onEditReason,
  onRelease,
  onClose,
}: BlacklistRosterModalProps) {
  const { data, isPending, isError } = useBlacklistRoster(true)

  return (
    <Modal title="블랙리스트 명단" onClose={onClose}>
      {data ? (
        <p className="text-ink-muted text-[13px]">
          현재 {data.page.totalElements}명 차단됨
        </p>
      ) : null}

      <div className="mt-4 max-h-[360px] overflow-y-auto">
        {isPending ? (
          <p className="text-ink-muted py-8 text-center text-[13px]">
            불러오는 중…
          </p>
        ) : null}

        {isError ? (
          <p role="alert" className="text-danger py-8 text-center text-[13px]">
            명단을 불러오지 못했습니다.
          </p>
        ) : null}

        {data && data.content.length === 0 ? (
          <p className="text-ink-muted py-8 text-center text-[13px]">
            차단된 사용자가 없습니다.
          </p>
        ) : null}

        {data && data.content.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.content.map((entry) => (
              <li
                key={entry.blacklistId}
                className="bg-surface-muted flex items-center gap-3 rounded-2xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate text-[13.5px] font-bold">
                    {entry.userEmail}
                  </p>
                  <p className="text-ink-muted mt-1 truncate text-[12.5px]">
                    차단 사유 · {entry.reason || '미입력'}
                  </p>
                </div>

                <AdminButton
                  variant="secondary"
                  size="sm"
                  className="shrink-0 rounded-full"
                  disabled={pendingEmail === entry.userEmail}
                  onClick={() => onEditReason(entry.userEmail, entry.reason)}
                >
                  수정
                </AdminButton>
                <AdminButton
                  variant="danger"
                  size="sm"
                  className="shrink-0 rounded-full"
                  disabled={pendingEmail === entry.userEmail}
                  onClick={() => onRelease(entry.userEmail)}
                >
                  해제
                </AdminButton>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-6">
        <AdminButton size="lg" fullWidth onClick={onClose}>
          닫기
        </AdminButton>
      </div>
    </Modal>
  )
}
