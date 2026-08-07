import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@/shared/ui'
import {
  ACCEPT_FAILURE,
  useAcceptConsultation,
} from '@/admin/features/consultation-receive/useAcceptConsultation'
import {
  MIC_PERMISSION,
  useMicPermission,
} from '@/admin/features/consultation-receive/useMicPermission'
import { WaitingCard } from '@/admin/features/consultation-receive/WaitingCard'
import {
  useWaitingConsultations,
  type WaitingConsultation,
} from '@/admin/features/consultation-receive/useWaitingConsultations'
import { toConsultationDetail } from '@/admin/features/consultation-room/useConsultationDetail'
import { useConsultationDetailStore } from '@/admin/features/consultation-room/useConsultationDetailStore'
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
  const setDetail = useConsultationDetailStore((s) => s.setDetail)

  /*
    마이크가 차단되어 있으면 수락 자체를 막는다.

    차단된 채로 수락하면 상담방에서 발행이 실패해 상담이 MATCHED 로 갇힌다.
    누르고 나서 알려 주는 것으로는 늦다 — 사용자는 이미 매칭을 기다리고 있고,
    이 역의 상담을 대신 받아 줄 역무원도 없다. 장치를 열지 않는 권한 조회라
    (useMicPermission) 팝업 없이 화면에 머무는 내내 감시할 수 있고, 역무원이
    권한을 허용하는 순간 새로고침 없이 풀린다.
  */
  const micPermission = useMicPermission()
  const isMicBlocked = micPermission === MIC_PERMISSION.DENIED

  const acceptConsultation = async (consultation: WaitingConsultation) => {
    const failure = await accept(consultation.consultationId)

    if (failure === ACCEPT_FAILURE.ALREADY_ACCEPTED) {
      showToast('다른 역무원이 먼저 수락한 상담입니다.')
      return
    }
    /*
      마이크를 못 쓰면 수락하지 않는다. 상담은 WAITING 그대로 남으므로
      권한을 고친 뒤 다시 누르면 된다. (useAcceptConsultation 참고)
    */
    if (failure === ACCEPT_FAILURE.MIC_DENIED) {
      showToast(
        '마이크가 차단되어 상담을 받을 수 없습니다. 브라우저에서 허용해 주세요.',
      )
      return
    }
    if (failure === ACCEPT_FAILURE.MIC_UNAVAILABLE) {
      showToast('마이크를 사용할 수 없습니다. 장치를 확인해 주세요.')
      return
    }
    if (failure === ACCEPT_FAILURE.UNKNOWN) {
      showToast('상담 연결에 실패했습니다. 다시 시도해 주세요.')
      return
    }

    showToast(`${consultation.email} 상담을 시작합니다`)
    /*
      상담 화면에 넘길 값은 전부 스토어로 간다. 라우팅 state 는 새로고침·
      뒤로가기에서 조용히 사라지므로 쓰지 않는다.
      - 세션 정보(sessionId·token): useAcceptConsultation 이 넣어 뒀다.
      - 상담 정보(이메일·출발지·목적지·언어): 여기서 넣는다. 상담방의 서버
        조회(GET /staffs/consultations/{id})가 BE 신설 대기라 수락 흐름에서는
        이 값이 유일한 실데이터다. 특히 블랙리스트 등록이 이 email 로 나간다.
    */
    setDetail(toConsultationDetail(consultation))
    void navigate(`/admin/consultation/${String(consultation.consultationId)}`)
  }

  return (
    <Panel
      title="상담 대기"
      titleRight={
        data ? <Chip tone="danger">{data.page.totalElements}건</Chip> : null
      }
    >
      {/*
        차단 안내는 목록보다 위에 둔다 — 대기자가 없을 때도 보여야 역무원이
        상담이 들어오기 전에 고칠 수 있다.
      */}
      {isMicBlocked ? (
        <div
          role="alert"
          className="border-danger/40 bg-danger/5 mb-4 rounded-2xl border px-5 py-4"
        >
          <p className="text-danger text-[13.5px] font-bold">
            마이크가 차단되어 상담을 받을 수 없습니다
          </p>
          <p className="text-ink-muted mt-1.5 text-[12.5px] leading-relaxed">
            주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요. 허용하면 바로
            상담을 받을 수 있습니다. 대기 중인 상담은 그대로 유지됩니다.
          </p>
        </div>
      ) : null}

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
              isMicBlocked={isMicBlocked}
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
