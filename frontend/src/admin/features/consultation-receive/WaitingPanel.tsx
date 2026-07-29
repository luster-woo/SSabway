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
import { Chip } from '@/admin/ui/Chip'
import { Panel } from '@/admin/ui/Panel'

/** 좌측 패널 — 상담 대기 목록 (FR-CALL-003) */
export function WaitingPanel() {
  const { data, isPending, isError } = useWaitingConsultations()
  const { accept, pendingId } = useAcceptConsultation()
  const { showToast } = useToast()

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

    // TODO: S15P11D104-153 화상 화면이 붙으면 수락 응답의 세션 정보를 넘기며 이동한다.
    showToast(`${consultation.email} 상담을 시작합니다`)
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
              isNext={index === 0}
              isPending={pendingId === consultation.consultationId}
              onAccept={() => void acceptConsultation(consultation)}
            />
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}
