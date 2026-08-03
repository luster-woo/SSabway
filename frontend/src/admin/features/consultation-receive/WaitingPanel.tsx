import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@/shared/ui'
import {
  ACCEPT_FAILURE,
  useAcceptConsultation,
} from '@/admin/features/consultation-receive/useAcceptConsultation'
import { WaitingCard } from '@/admin/features/consultation-receive/WaitingCard'
import {
  useWaitingConsultations,
  type WaitingConsultation,
} from '@/admin/features/consultation-receive/useWaitingConsultations'
import { AdminButton } from '@/admin/ui/AdminButton'
import { Chip } from '@/admin/ui/Chip'
import { Panel } from '@/admin/ui/Panel'

/** 좌측 패널 — 상담 대기 목록 (FR-CALL-003) */
export function WaitingPanel() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, isFetching } = useWaitingConsultations(page)
  const { accept, pendingId } = useAcceptConsultation()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const acceptConsultation = async (consultation: WaitingConsultation) => {
    const failure = await accept(consultation.consultationId)

    if (failure === ACCEPT_FAILURE.ALREADY_ACCEPTED) {
      showToast('다른 역무원이 먼저 수락한 상담입니다.')
      return
    }
    if (failure === ACCEPT_FAILURE.UNKNOWN) {
      showToast('상담 연결에 실패했습니다. 다시 시도해 주세요.')
      return
    }

    showToast(`${consultation.email} 상담을 시작합니다`)
    /*
      세션 정보(sessionId·token)는 useAcceptConsultation 이 스토어에
      넣어 뒀다. 라우팅 state 로 넘기면 새로고침·뒤로가기에서 사라진다.
    */
    void navigate(`/admin/consultation/${String(consultation.consultationId)}`)
  }

  return (
    <Panel
      title="상담 대기"
      titleRight={
        data ? <Chip tone="danger">{data.page.totalElements}건</Chip> : null
      }
    >
      {isPending ? (
        <p className="text-ink-muted py-10 text-center text-[13px]">
          불러오는 중…
        </p>
      ) : null}

      {isError ? (
        <p role="alert" className="text-danger py-10 text-center text-[13px]">
          대기 목록을 불러오지 못했습니다.
        </p>
      ) : null}

      {data && data.content.length === 0 ? (
        <p className="text-ink-muted py-10 text-center text-[13px]">
          대기 중인 상담이 없습니다.
        </p>
      ) : null}

      {data && data.content.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {data.content.map((consultation, index) => (
            <WaitingCard
              key={consultation.consultationId}
              consultation={consultation}
              isNext={page === 1 && index === 0}
              isPending={pendingId === consultation.consultationId}
              onAccept={() => void acceptConsultation(consultation)}
            />
          ))}
        </ul>
      ) : null}

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
    </Panel>
  )
}
