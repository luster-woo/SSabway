import { useEffect, useState } from 'react'

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
import { HistorySearchBar } from '@/admin/features/dashboard/HistorySearchBar'
import {
  EMPTY_HISTORY_FILTER,
  isFiltered as hasFilter,
  type HistoryFilter,
} from '@/admin/features/dashboard/historyFilter'
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

export interface HistoryPanelProps {
  /**
   * 블랙리스트 명단 모달 열림 여부.
   *
   * 여는 버튼은 관리자 헤더(AdminMainPage)에 있고 모달 본체와 등록·해제 로직은
   * 여기에 있어서, 열림 상태만 위로 올려 두 곳이 공유한다. 사유 수정 모달을
   * 띄우는 동안 명단을 잠시 닫았다가 되돌리는 흐름도 이 setter 로 처리한다.
   */
  isRosterOpen: boolean
  onRosterOpenChange: (isOpen: boolean) => void
}

/** 우측 패널 — 민원 기록 (FR-STAFF-001, FR-STAFF-002) */
export function HistoryPanel({
  isRosterOpen,
  onRosterOpenChange,
}: HistoryPanelProps) {
  const [page, setPage] = useState(1)
  /*
    화면에 "적용된" 검색 조건. 입력 중인 값은 HistorySearchBar 가 들고 있고,
    [검색] 을 눌러야 여기로 넘어온다. 조건이 바뀌면 이전 조건의 페이지 번호는
    의미가 없으므로 항상 1 페이지부터 다시 본다.
  */
  const [filter, setFilter] = useState<HistoryFilter>(EMPTY_HISTORY_FILTER)
  const isSearching = hasFilter(filter)

  const { data, isPending, isError, isFetching } = useConsultationHistory({
    page,
    ...filter,
  })

  const search = (next: HistoryFilter) => {
    setPage(1)
    setFilter(next)
  }

  /*
    마지막 페이지의 항목이 줄어(예: 블랙리스트 처리 후 재조회) 현재 페이지가
    총 페이지 수를 넘으면 마지막 페이지로 되돌린다. 보정하지 않으면 빈 목록에
    페이지 이동 버튼까지 사라져 빠져나갈 수 없다. (건수 0 이면 최소 1 페이지)
  */
  useEffect(() => {
    if (data && page > data.page.totalPages) {
      setPage(Math.max(1, data.page.totalPages))
    }
  }, [data, page])

  const {
    registerBlacklist,
    updateBlacklistReason,
    releaseBlacklist,
    lastFailureMessage,
    pendingEmail,
  } = useBlacklist()
  const { showToast } = useToast()

  const { loadRecord, pendingId } = useConsultationRecord()

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
    onRosterOpenChange(false)
    setReasonTarget({
      userEmail,
      isEditMode: true,
      initialReasons: splitReasons(reason),
      fromRoster,
    })
  }

  const closeReasonModal = () => {
    // 명단에서 열었으면 닫을 때 명단으로 되돌린다.
    if (reasonTarget?.fromRoster) onRosterOpenChange(true)
    setReasonTarget(null)
  }

  const submitReason = async (reason: string) => {
    if (reasonTarget === null) return

    const { userEmail, isEditMode, fromRoster } = reasonTarget
    const isDone = isEditMode
      ? await updateBlacklistReason(userEmail, reason)
      : await registerBlacklist(userEmail, reason)

    setReasonTarget(null)
    if (fromRoster) onRosterOpenChange(true)

    if (!isDone) {
      showToast(
        lastFailureMessage() ??
          (isEditMode ? '사유 수정에 실패했습니다.' : '등록에 실패했습니다.'),
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
      isReleased
        ? '블랙리스트에서 해제했습니다.'
        : (lastFailureMessage() ?? '해제에 실패했습니다.'),
    )
  }

  return (
    <>
      <Panel
        title="민원 기록"
        titleRight={
          <HistorySearchBar
            onSearch={search}
            isFiltered={isSearching}
            isFetching={isFetching}
          />
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

        {/* 검색 중일 때만 건수를 보여 준다. 조건 없이 전체를 볼 때는 소음이다. */}
        {data && isSearching ? (
          <p
            aria-live="polite"
            className="text-ink-muted mb-3 text-[12.5px] font-bold"
          >
            검색 결과 {data.page.totalElements}건
          </p>
        ) : null}

        {data && data.content.length === 0 ? (
          <p className="text-ink-muted py-10 text-center text-[13px]">
            {isSearching
              ? '조건에 맞는 민원 기록이 없습니다.'
              : '민원 기록이 없습니다.'}
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
          onClose={() => onRosterOpenChange(false)}
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
