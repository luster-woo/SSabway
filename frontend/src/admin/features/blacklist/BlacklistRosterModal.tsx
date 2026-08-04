import { useEffect, useState } from 'react'

import {
  joinReasons,
  toReasonLabels,
} from '@/admin/features/blacklist/blacklistReasons'
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
  const [page, setPage] = useState(1)
  const { data, isPending, isError, isFetching } = useBlacklistRoster(
    true,
    page,
  )

  /*
    마지막 페이지에서 사용자를 해제해 목록이 줄면 현재 페이지가 총 페이지 수를
    넘을 수 있다. 그대로 두면 빈 명단에 페이지 이동 버튼까지 사라지므로 마지막
    페이지로 되돌린다. (전원 해제로 0명이 되면 최소 1 페이지로 막는다)
  */
  useEffect(() => {
    if (data && page > data.page.totalPages) {
      setPage(Math.max(1, data.page.totalPages))
    }
  }, [data, page])

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
                key={entry.userEmail}
                className="bg-surface-muted flex items-center gap-3 rounded-2xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate text-[13.5px] font-bold">
                    {entry.userEmail}
                  </p>
                  <p className="text-ink-muted mt-1 truncate text-[12.5px]">
                    차단 사유 ·{' '}
                    {joinReasons(toReasonLabels(entry.reasons)) || '미입력'}
                  </p>
                </div>

                <AdminButton
                  variant="secondary"
                  size="sm"
                  className="shrink-0 rounded-full"
                  disabled={pendingEmail === entry.userEmail}
                  onClick={() =>
                    onEditReason(
                      entry.userEmail,
                      joinReasons(toReasonLabels(entry.reasons)),
                    )
                  }
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

      {data && data.page.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <AdminButton
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={data.page.first || isFetching}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            이전
          </AdminButton>
          <span className="text-ink-muted text-[12.5px]">
            {data.page.number} / {data.page.totalPages}
          </span>
          <AdminButton
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={data.page.last || isFetching}
            onClick={() => setPage((prev) => prev + 1)}
          >
            다음
          </AdminButton>
        </div>
      ) : null}

      <div className="mt-6">
        <AdminButton size="lg" fullWidth onClick={onClose}>
          닫기
        </AdminButton>
      </div>
    </Modal>
  )
}
