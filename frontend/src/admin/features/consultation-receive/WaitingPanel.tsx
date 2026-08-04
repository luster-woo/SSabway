import { useEffect, useState } from 'react'
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

  /*
    목록이 줄어 현재 페이지가 총 페이지 수를 넘으면 마지막 페이지로 되돌린다.
    대기 목록은 3초마다 폴링해 건수가 계속 바뀌는데, 보정하지 않으면 서버가
    빈 목록을 주고 `totalPages > 1` 도 거짓이 되어 페이지 이동 버튼까지 사라진다
    — 빈 화면에 갇혀 새 대기자가 와도 보지 못한다.
    (건수 0 이면 totalPages 도 0 이라 최소 1 페이지로 막는다)
  */
  useEffect(() => {
    if (data && page > data.page.totalPages) {
      setPage(Math.max(1, data.page.totalPages))
    }
  }, [data, page])

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
    void navigate(
      `/admin/consultation/${String(consultation.consultationId)}`,
      {
        /*
        상담 정보(이메일·출발지·목적지·언어)를 함께 넘긴다. 상담방의 서버
        조회(GET /staffs/consultations/{id})가 BE 신설 대기라, 수락 흐름에서는
        이 값이 유일한 실데이터다. 특히 블랙리스트 등록이 이 email 로 나간다.
        새로고침하면 사라지고 서버 조회 폴백을 탄다 — useConsultationDetail 참고.
      */
        state: { waiting: consultation },
      },
    )
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
