import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { resolveAdminUserLangCode } from '@/shared/lib/demoCaptionLang'
import { queryKeys } from '@/shared/lib/queryKeys'
import { useRunOnRealUnmount } from '@/shared/lib/useRunOnRealUnmount'
import { useToast } from '@/shared/ui'
import { OV_FAILURE, OV_STATUS } from '@/shared/webrtc/useOpenViduSession'
import { BlacklistReasonModal } from '@/admin/features/blacklist/BlacklistReasonModal'
import { useBlacklist } from '@/admin/features/blacklist/useBlacklist'
import { ConsultationInfoPanel } from '@/admin/features/consultation-room/ConsultationInfoPanel'
import { EndConsultationDialog } from '@/admin/features/consultation-room/EndConsultationDialog'
import { useConsultationDetail } from '@/admin/features/consultation-room/useConsultationDetail'
import { useConsultationRoom } from '@/admin/features/consultation-room/useConsultationRoom'
import { useEndConsultation } from '@/admin/features/consultation-room/useEndConsultation'
import { useStaffCancelConsultation } from '@/admin/features/consultation-room/useStaffCancelConsultation'
import { UserLocationModal } from '@/admin/features/consultation-room/UserLocationModal'
import { VideoStage } from '@/admin/features/consultation-room/VideoStage'
import { AdminShell } from '@/admin/ui/AdminShell'

/**
 * 관리자 3. 화상 상담 — /admin/consultation/:consultationId
 *
 * 상담 정보는 스토어(sessionStorage persist)에 있어 새로고침해도 화면이
 * 유지된다. URL 의 consultationId 와 스토어 값이 일치할 때만 쓴다.
 * 블랙리스트 등록은 통화를 끊지 않고 등록만 한다. 종료는 역무원이 따로 누른다.
 */
export default function AdminConsultationPage() {
  const navigate = useNavigate()
  const { consultationId: consultationIdParam } = useParams()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const consultationId = Number(consultationIdParam)
  const isValidId = Number.isInteger(consultationId) && consultationId > 0

  /*
    상담 정보는 수락 화면(WaitingPanel)이 스토어에 넣어 둔 값을
    useConsultationDetail 이 읽는다. sessionStorage 에 남으므로 새로고침해도
    유지되고, 스토어가 빌 때(직접 URL 진입 등)만 서버 조회 폴백이 돈다.
  */
  const {
    data: detail,
    isPending,
    isError,
  } = useConsultationDetail(isValidId ? consultationId : 0)
  const { registerBlacklist, lastFailureMessage, pendingEmail } = useBlacklist()
  const { endConsultation, isPending: isEndPending } = useEndConsultation()
  const { cancelConsultation } = useStaffCancelConsultation()
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

  /**
   * 사용자가 먼저 나가 세션이 닫히면 이 화면도 목록으로 돌린다.
   *
   * 사용자가 [통화 종료] 를 누르면 상담 종료 API 까지 호출하므로 서버가
   * OpenVidu 세션을 닫고, 이쪽에는 `sessionDisconnected` 가 온다. 이 신호를
   * 받지 않으면 이미 끝난 상담방에 역무원이 계속 남아 있게 된다.
   *
   * 한 번 연결된 뒤의 DISCONNECTED 만 본다 (접속 전 IDLE 과 구분).
   * 역무원이 직접 종료한 경우는 submitEnd 가 먼저 이동시킨다.
   */
  const hasConnectedRef = useRef(false)
  if (room.status === OV_STATUS.CONNECTED) hasConnectedRef.current = true

  /**
   * 이미 명시적 이탈 경로(사용자 종료 감지·종료 버튼·마이크 실패 취소)로
   * 처리됐는지. 아래 언마운트 정리(useRunOnRealUnmount)가 그 경우를 건너뛰어
   * 이미 끝난/취소된 상담에 end 를 또 보내지 않게 한다.
   */
  const handledRef = useRef(false)

  useEffect(() => {
    if (!hasConnectedRef.current) return
    if (room.status !== OV_STATUS.DISCONNECTED) return

    handledRef.current = true

    /*
      상담 관련 쿼리를 무효화하고 나간다.

      이게 없으면 사용자가 끊은 상담이 민원 기록에 새로고침 전까지 안 나온다.
      돌아갈 /admin 의 HistoryPanel 은 폴링하지 않고(useConsultationHistory),
      전역 staleTime 이 60초라(app/providers/QueryProvider) 다시 마운트돼도
      캐시를 fresh 로 보고 재조회하지 않기 때문이다. 역무원이 직접 종료하는
      경로는 useEndConsultation 이 같은 무효화를 하고 있다.

      ⚠️ 이것만으로 완전하지는 않다. BE 의 ConsultationEndService 가 OpenVidu
         세션을 먼저 닫고(closeSessionIfActive) 그다음에 ENDED 를 쓰는데,
         이 화면이 받는 sessionDisconnected 는 앞쪽에서 발생한다. 즉 재조회가
         ENDED 기록보다 먼저 도착할 수 있다. 근본 해결은 BE 에서 상태 갱신을
         세션 종료보다 앞으로 옮기는 것이다. (역무원 종료 경로가 항상 맞는
         이유도 그쪽은 end 응답을 받은 뒤에 무효화하기 때문이다)
    */
    void queryClient.invalidateQueries({
      queryKey: queryKeys.consultation.all,
    })

    showToast('사용자가 통화를 종료했습니다.')
    void navigate('/admin', { replace: true })
  }, [navigate, queryClient, room.status, showToast])

  /**
   * 마이크를 쓸 수 없어 발행이 실패하면 상담을 취소하고 목록으로 돌아간다.
   *
   * 이 역의 상담을 대신 받아 줄 역무원이 없으므로(역마다 계정 하나) 상담을
   * 그대로 두면 사용자가 대기에서 영영 풀리지 않는다.
   *
   * 정상 경로는 수락 전에 걸러내는 것이다(WaitingPanel 의 마이크 게이트).
   * 여기까지 오는 것은 그 뒤에 깨진 경우다 — 수락과 입장 사이에 권한이
   * 회수됐거나, 마이크가 뽑혔거나, 다른 앱이 점유한 경우.
   *
   * 장치 문제만 취소한다. 접속 실패·네트워크 같은 OTHER 는 상담을 취소할
   * 이유가 아니라 그대로 둔다(VideoStage 가 "연결에 실패했습니다"를 띄운다).
   *
   * 이 경로에서는 status 가 CONNECTED 를 거치지 않으므로 위쪽 종료 감지
   * 이펙트(hasConnectedRef)와 겹치지 않는다.
   */
  const isCancelRequestedRef = useRef(false)

  useEffect(() => {
    if (room.status !== OV_STATUS.FAILED) return
    if (
      room.failure !== OV_FAILURE.DEVICE_DENIED &&
      room.failure !== OV_FAILURE.DEVICE_UNAVAILABLE
    ) {
      return
    }
    // 상태가 유지되는 동안 이펙트가 다시 돌아도 취소는 한 번만 보낸다
    if (isCancelRequestedRef.current) return
    isCancelRequestedRef.current = true
    handledRef.current = true

    const reason =
      room.failure === OV_FAILURE.DEVICE_DENIED
        ? '마이크 권한이 없어'
        : '마이크를 사용할 수 없어'

    void cancelConsultation(consultationId).then((isCanceled) => {
      showToast(
        isCanceled
          ? `${reason} 상담을 취소했습니다.`
          : `${reason} 상담을 진행할 수 없습니다. 취소에 실패했으니 다시 시도해 주세요.`,
      )
      void navigate('/admin', { replace: true })
    })
  }, [
    cancelConsultation,
    consultationId,
    navigate,
    room.failure,
    room.status,
    showToast,
  ])

  /*
    역무원이 상담방을 앱 내에서 벗어날 때(하드웨어 back·다른 메뉴 이동) 상담을
    종료한다. 그대로 두면 상담이 IN_PROGRESS 로 남아 녹음이 계속 돌고, 사용자는
    상대가 사라진 화면에 갇힌다. 역무원은 역마다 계정 하나라 대신 받아 줄 사람도 없다.

    이미 처리된 경로(handledRef: 사용자 종료·[종료] 버튼·마이크 실패 취소)와
    한 번도 연결되지 않은 경우(hasConnectedRef)는 건너뛴다. end 는 멱등이라
    혹시 겹쳐도 안전하지만, 취소(CANCELED)된 상담에까지 보내지 않도록 가른다.

    ⚠️ 새로고침·탭 닫기는 여기서 못 잡는다(useRunOnRealUnmount 주석). 이 화면은
       새로고침 시 스토어·URL 로 복구되므로 그 경로에 end 를 보내면 안 되고,
       탭 닫기·강제 종료의 정리는 서버 유예 시간이 맡아야 한다.
  */
  useRunOnRealUnmount(() => {
    if (!hasConnectedRef.current) return
    if (handledRef.current) return
    void endConsultation(consultationId)
  })

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
        : (lastFailureMessage() ?? '블랙리스트 등록에 실패했습니다.'),
    )
  }

  const submitEnd = async () => {
    const result = await endConsultation(consultationId)
    setIsEndDialogOpen(false)

    if (result === null) {
      showToast('상담 종료에 실패했습니다. 다시 시도해 주세요.')
      return
    }

    // 명시적 종료로 이미 처리됐다 — 이어질 언마운트가 end 를 또 보내지 않게 한다.
    handledRef.current = true
    showToast('상담을 종료했습니다.')
    void navigate('/admin', { replace: true })
  }

  return (
    <AdminShell>
      <div className="flex min-h-0 flex-1 gap-6 p-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <VideoStage
            userStream={room.userStream}
            userLang={resolveAdminUserLangCode(detail?.langCode ?? null)}
            status={room.status}
            isRestoring={room.isRestoring}
            isRestoreFailed={room.isRestoreFailed}
            isRecording={room.isRecording}
            userScreenAspect={room.userScreenAspect}
          />
        </div>

        {isPending ? (
          <section className="border-line bg-surface flex w-[340px] shrink-0 items-center justify-center rounded-3xl border">
            <p className="text-ink-muted text-[13px]">불러오는 중…</p>
          </section>
        ) : null}

        {/*
          데이터가 있으면 에러를 띄우지 않는다.

          이 쿼리는 스토어 값을 initialData 로 받으므로(useConsultationDetail),
          뒤이은 재조회가 실패해도 data 는 남고 isError 만 켜진다. 두 조건을
          독립으로 두면 정상 정보 패널 옆에 "불러오지 못했습니다" 카드가 같이
          뜬다. 보여줄 값이 아예 없을 때만 실패로 취급한다.
        */}
        {isError && !detail ? (
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
