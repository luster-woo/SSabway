import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { useToast } from '@/shared/ui'
import { BlacklistReasonModal } from '@/admin/features/blacklist/BlacklistReasonModal'
import { useBlacklist } from '@/admin/features/blacklist/useBlacklist'
import { ConsultationInfoPanel } from '@/admin/features/consultation-room/ConsultationInfoPanel'
import { EndConsultationDialog } from '@/admin/features/consultation-room/EndConsultationDialog'
import { useConsultationDetail } from '@/admin/features/consultation-room/useConsultationDetail'
import { useConsultationRoom } from '@/admin/features/consultation-room/useConsultationRoom'
import { useEndConsultation } from '@/admin/features/consultation-room/useEndConsultation'
import { UserLocationModal } from '@/admin/features/consultation-room/UserLocationModal'
import { VideoStage } from '@/admin/features/consultation-room/VideoStage'
import { AdminShell } from '@/admin/ui/AdminShell'

/**
 * 관리자 3. 화상 상담 — /admin/consultation/:consultationId
 *
 * 상담 정보를 URL 의 consultationId 로 조회하므로 새로고침해도 화면이 유지된다.
 * 블랙리스트 등록은 통화를 끊지 않고 등록만 한다. 종료는 역무원이 따로 누른다.
 */
export default function AdminConsultationPage() {
  const navigate = useNavigate()
  const { consultationId: consultationIdParam } = useParams()
  const { showToast } = useToast()

  const consultationId = Number(consultationIdParam)
  const isValidId = Number.isInteger(consultationId) && consultationId > 0

  const {
    data: detail,
    isPending,
    isError,
  } = useConsultationDetail(isValidId ? consultationId : 0)
  const { registerBlacklist, pendingEmail } = useBlacklist()
  const { endConsultation, isPending: isEndPending } = useEndConsultation()
  const room = useConsultationRoom(isValidId ? consultationId : 0)

  const [isReasonOpen, setIsReasonOpen] = useState(false)
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)

  /**
   * 이번 통화 중에 블랙리스트로 등록했는지.
   *
   * 서버에서 받지 않는다. 블랙리스트 사용자는 화상 연결 자체가 거부되므로
   * 상담방에 들어온 시점에는 항상 false 이고, 등록 직후 버튼을 잠가
   * 같은 사용자를 다시 등록하지 못하게 하는 용도만 남는다.
   */
  const [isBlacklisted, setIsBlacklisted] = useState(false)

  // 잘못된 URL 로 들어온 경우. 조회를 시도하지 않고 목록으로 돌린다.
  if (!isValidId) return <Navigate to="/admin" replace />

  const submitBlacklist = async (reason: string) => {
    if (!detail) return

    const isRegistered = await registerBlacklist(detail.email, reason)
    if (isRegistered) setIsBlacklisted(true)
    setIsReasonOpen(false)
    showToast(
      isRegistered
        ? '사유와 함께 블랙리스트에 등록했습니다.'
        : '블랙리스트 등록에 실패했습니다.',
    )
  }

  const submitEnd = async () => {
    const result = await endConsultation(consultationId)
    setIsEndDialogOpen(false)

    if (result === null) {
      showToast('상담 종료에 실패했습니다. 다시 시도해 주세요.')
      return
    }

    showToast('상담을 종료했습니다.')
    void navigate('/admin', { replace: true })
  }

  return (
    <AdminShell>
      <div className="flex min-h-0 flex-1 gap-6 p-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <VideoStage
            userStream={room.userStream}
            status={room.status}
            isRestoring={room.isRestoring}
            isRestoreFailed={room.isRestoreFailed}
            isRecording={room.isRecording}
          />
        </div>

        {isPending ? (
          <section className="border-line bg-surface flex w-[340px] shrink-0 items-center justify-center rounded-3xl border">
            <p className="text-ink-muted text-[13px]">불러오는 중…</p>
          </section>
        ) : null}

        {isError ? (
          <section className="border-line bg-surface flex w-[340px] shrink-0 items-center justify-center rounded-3xl border px-7">
            <p role="alert" className="text-danger text-center text-[13px]">
              상담 정보를 불러오지 못했습니다.
            </p>
          </section>
        ) : null}

        {detail ? (
          <ConsultationInfoPanel
            detail={detail}
            isBlacklisted={isBlacklisted}
            isBanPending={pendingEmail === detail.email}
            onViewLocation={() => setIsLocationOpen(true)}
            onRegisterBlacklist={() => setIsReasonOpen(true)}
            onEndConsultation={() => setIsEndDialogOpen(true)}
          />
        ) : null}
      </div>

      {isLocationOpen ? (
        <UserLocationModal
          consultationId={consultationId}
          onClose={() => setIsLocationOpen(false)}
        />
      ) : null}

      {isReasonOpen && detail ? (
        <BlacklistReasonModal
          userEmail={detail.email}
          isPending={pendingEmail === detail.email}
          onSubmit={(reason) => void submitBlacklist(reason)}
          onClose={() => setIsReasonOpen(false)}
        />
      ) : null}

      {isEndDialogOpen ? (
        <EndConsultationDialog
          isPending={isEndPending}
          onConfirm={() => void submitEnd()}
          onClose={() => setIsEndDialogOpen(false)}
        />
      ) : null}
    </AdminShell>
  )
}
