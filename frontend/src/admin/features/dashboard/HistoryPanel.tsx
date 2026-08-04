import { useState } from 'react'

import { useToast } from '@/shared/ui'
import { BlacklistReasonModal } from '@/admin/features/blacklist/BlacklistReasonModal'
import { BlacklistRosterModal } from '@/admin/features/blacklist/BlacklistRosterModal'
import {
  splitReasons,
  type BlacklistReason,
} from '@/admin/features/blacklist/blacklistReasons'
import { useBlacklist } from '@/admin/features/blacklist/useBlacklist'
import { ConsultationRecordModal } from '@/admin/features/dashboard/ConsultationRecordModal'
import { HistoryCard } from '@/admin/features/dashboard/HistoryCard'
import {
  useConsultationHistory,
  type ConsultationHistory,
} from '@/admin/features/dashboard/useConsultationHistory'
import { useConsultationRecord } from '@/admin/features/dashboard/useConsultationRecord'
import { AdminButton } from '@/admin/ui/AdminButton'
import { Panel } from '@/admin/ui/Panel'

/** 사유 선택 모달을 띄운 대상. 수정 모드면 기존 사유를 미리 채운다. */
interface ReasonTarget {
  userEmail: string
  isEditMode: boolean
  initialReasons: BlacklistReason[]
  /** 명단에서 열었는지. 닫을 때 명단으로 되돌리기 위해 기억한다. */
  fromRoster: boolean
}

/**
 * 원본 내역 모달에 띄울 대상. 조회에 성공한 뒤에만 열린다.
 *
 * recordUrl 이 null 인 것은 실패가 아니라 "녹취가 없는 상담"이라는 정상 응답이다.
 * 요약은 보여줄 수 있으므로 모달을 열고, 모달이 플레이어만 감춘다.
 */
interface RecordTarget {
  userEmail: string
  summary: string | null
  recordUrl: string | null
}

/** 우측 패널 — 민원 기록 (FR-STAFF-001, FR-STAFF-002) */
export function HistoryPanel() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, isFetching } = useConsultationHistory(page)
  const {
    registerBlacklist,
    updateBlacklistReason,
    releaseBlacklist,
    pendingEmail,
  } = useBlacklist()
  const { showToast } = useToast()

  const { loadRecord, pendingId } = useConsultationRecord()

  const [isRosterOpen, setIsRosterOpen] = useState(false)
  const [reasonTarget, setReasonTarget] = useState<ReasonTarget | null>(null)
  const [recordTarget, setRecordTarget] = useState<RecordTarget | null>(null)

  const openRecordModal = async (history: ConsultationHistory) => {
    const record = await loadRecord(history.consultationId)

    // 조회 실패(네트워크·404·500)만 토스트로 끝낸다. 녹취가 없는 상담은
    // record 가 돌아오고 recordUrl 만 null 이므로 아래로 내려가 모달이 열린다.
    if (record === null) {
      showToast('원본 기록을 불러오지 못했습니다.')
      return
    }

    setRecordTarget({
      // 서버 응답을 우선한다. 목록을 받은 뒤 요약이 갱신됐을 수 있고,
      // 요약이 아직 없는 상담은 null 로 온다(모달이 문구로 대체한다).
      userEmail: record.email,
      summary: record.summary,
      recordUrl: record.recordUrl,
    })
  }

  const openRegisterModal = (userEmail: string) => {
    setReasonTarget({
      userEmail,
      isEditMode: false,
      initialReasons: [],
      fromRoster: false,
    })
  }

  const openEditModal = (
    userEmail: string,
    reason: string,
    fromRoster: boolean,
  ) => {
    setIsRosterOpen(false)
    setReasonTarget({
      userEmail,
      isEditMode: true,
      initialReasons: splitReasons(reason),
      fromRoster,
    })
  }

  const closeReasonModal = () => {
    // 명단에서 열었으면 닫을 때 명단으로 되돌린다.
    if (reasonTarget?.fromRoster) setIsRosterOpen(true)
    setReasonTarget(null)
  }

  const submitReason = async (reason: string) => {
    if (reasonTarget === null) return

    const { userEmail, isEditMode, fromRoster } = reasonTarget
    const isDone = isEditMode
      ? await updateBlacklistReason(userEmail, reason)
      : await registerBlacklist(userEmail, reason)

    setReasonTarget(null)
    if (fromRoster) setIsRosterOpen(true)

    if (!isDone) {
      showToast(
        isEditMode ? '사유 수정에 실패했습니다.' : '등록에 실패했습니다.',
      )
      return
    }
    showToast(
      isEditMode
        ? '차단 사유를 수정했습니다.'
        : '사유와 함께 블랙리스트에 등록했습니다.',
    )
  }

  const submitRelease = async (userEmail: string) => {
    const isReleased = await releaseBlacklist(userEmail)
    showToast(
      isReleased ? '블랙리스트에서 해제했습니다.' : '해제에 실패했습니다.',
    )
  }

  return (
    <>
      <Panel
        title="민원 기록"
        titleRight={
          <AdminButton
            variant="dangerOutline"
            size="sm"
            className="rounded-full"
            onClick={() => setIsRosterOpen(true)}
          >
            블랙리스트 명단
          </AdminButton>
        }
      >
        {isPending ? (
          <p className="text-ink-muted py-10 text-center text-[13px]">
            불러오는 중…
          </p>
        ) : null}

        {isError ? (
          <p role="alert" className="text-danger py-10 text-center text-[13px]">
            민원 기록을 불러오지 못했습니다.
          </p>
        ) : null}

        {data && data.content.length === 0 ? (
          <p className="text-ink-muted py-10 text-center text-[13px]">
            민원 기록이 없습니다.
          </p>
        ) : null}

        {data && data.content.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {data.content.map((history) => (
              <HistoryCard
                key={history.consultationId}
                history={history}
                isPending={pendingEmail === history.userEmail}
                isRecordPending={pendingId === history.consultationId}
                onViewOriginal={() => void openRecordModal(history)}
                onRegisterBlacklist={openRegisterModal}
                onReleaseBlacklist={(userEmail) =>
                  void submitRelease(userEmail)
                }
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

      {isRosterOpen ? (
        <BlacklistRosterModal
          pendingEmail={pendingEmail}
          onEditReason={(userEmail, reason) =>
            openEditModal(userEmail, reason, true)
          }
          onRelease={(userEmail) => void submitRelease(userEmail)}
          onClose={() => setIsRosterOpen(false)}
        />
      ) : null}

      {recordTarget !== null ? (
        <ConsultationRecordModal
          userEmail={recordTarget.userEmail}
          summary={recordTarget.summary}
          recordUrl={recordTarget.recordUrl}
          onClose={() => setRecordTarget(null)}
        />
      ) : null}

      {reasonTarget !== null ? (
        <BlacklistReasonModal
          userEmail={reasonTarget.userEmail}
          initialReasons={reasonTarget.initialReasons}
          isEditMode={reasonTarget.isEditMode}
          isPending={pendingEmail === reasonTarget.userEmail}
          onSubmit={(reason) => void submitReason(reason)}
          onClose={closeReasonModal}
        />
      ) : null}
    </>
  )
}
