import { useCallback, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import { useConsultationSessionStore } from '@/shared/lib/store/useConsultationSessionStore'
import {
  checkMicPermission,
  MIC_CHECK,
} from '@/admin/features/consultation-receive/micPermission'
import { openviduApi } from '@/admin/lib/openviduApi'

/** 상담 수락 실패 사유. 화면이 분기해야 하는 경우만 구분한다. */
export const ACCEPT_FAILURE = {
  /** 409 ALREADY_ACCEPTED — 다른 역무원이 먼저 수락 */
  ALREADY_ACCEPTED: 'ALREADY_ACCEPTED',
  /** 마이크 권한이 차단되어 수락하지 않았다 */
  MIC_DENIED: 'MIC_DENIED',
  /** 마이크 장치를 쓸 수 없어 수락하지 않았다 */
  MIC_UNAVAILABLE: 'MIC_UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
} as const

export type AcceptFailure = (typeof ACCEPT_FAILURE)[keyof typeof ACCEPT_FAILURE]

export interface UseAcceptConsultationResult {
  /** 성공하면 null, 실패하면 사유를 반환한다. */
  accept: (consultationId: number) => Promise<AcceptFailure | null>
  /** 수락 요청 중인 상담 ID. 해당 카드만 버튼을 비활성화하는 데 쓴다. */
  pendingId: number | null
}

/**
 * 상담 수락 — accept 1-call (상태 잠금 + 세션 생성 + 토큰 발급).
 *
 * 호출은 `@/shared/api/openvidu` 의 openSession 이 책임진다.
 * 여기서는 결과를 스토어에 넣어 상담 화면으로 넘기는 일만 한다.
 * (8/4 — API 소유가 ssabway 로 이동. openSession 주석 참고)
 *
 * 녹음은 여기서 시작하지 않는다 — 사용자까지 접속한 뒤 상담방 훅
 * (useConsultationRoom)이 start 를 불러 시작한다. 팀 합의(7/31).
 *
 * 선착순은 서버가 상담 상태 잠금으로 판정한다. 늦게 누른 역무원은
 * 409 CONSULTATION_ALREADY_ACCEPTED 를 받는다.
 *
 * 실패해도 대기 목록 쿼리를 무효화한다. 이미 없어진 항목이 화면에 남으면 안 된다.
 *
 * 수락에 앞서 마이크부터 확인한다 — 마이크 없이 수락하면 상담방에서 발행이
 * 실패하고, 그 상담은 대신 받아 줄 역무원이 없어(역마다 계정 하나) MATCHED 로
 * 갇힌다. 그래서 마이크를 못 쓰면 수락 자체를 하지 않는다.
 *
 * ⚠️ 상담을 **취소하지는 않는다.** 마이크 거부는 역무원 브라우저 설정 문제이지
 *    사용자의 의사가 아니다. 여기서 취소해 버리면 차단이 저장된 역무원이
 *    [수락] 을 누를 때마다 그 역의 상담이 줄줄이 취소되고(CANCELED 는 재요청을
 *    막지 않아 사용자가 다시 요청해도 똑같이 취소된다), 사용자는 이유도 모른 채
 *    거절만 당한다. 상담은 WAITING 으로 두어 순번을 지키고, 역무원이 권한을
 *    고치면 그대로 이어서 수락하면 된다.
 *
 *    상담방 안에서 발행이 실패하는 경우는 다르다 — 이미 MATCHED 라 되돌릴 곳이
 *    없어 그쪽만 취소한다(useStaffCancelConsultation).
 */
export function useAcceptConsultation(): UseAcceptConsultationResult {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const startSession = useConsultationSessionStore((s) => s.startSession)

  const accept = useCallback(
    async (consultationId: number): Promise<AcceptFailure | null> => {
      setPendingId(consultationId)

      try {
        /*
          권한 팝업이 떠 있는 동안에도 pendingId 가 유지되어 해당 카드의
          [수락] 버튼은 잠겨 있다 — 역무원이 팝업을 두고 다시 누르지 못한다.
        */
        const mic = await checkMicPermission()

        if (mic !== MIC_CHECK.OK) {
          /*
            서버에 아무것도 보내지 않고 돌아간다. 상담은 WAITING 그대로라
            대기 목록에 남고, 역무원이 마이크를 고치면 다시 누르면 된다.
          */
          return mic === MIC_CHECK.DENIED
            ? ACCEPT_FAILURE.MIC_DENIED
            : ACCEPT_FAILURE.MIC_UNAVAILABLE
        }

        const session = await openviduApi.openSession(consultationId)

        startSession(session)
        return null
      } catch (error) {
        if (!axios.isAxiosError(error)) return ACCEPT_FAILURE.UNKNOWN

        /*
          ssabway 이관(8/4)으로 응답에 code 가 실린다. code 가 있으면 그걸로
          판정하고, 없으면(구버전 서버·프록시 오류 등) 상태코드 409 로
          폴백한다 — 서버가 상담 상태를 잠그므로 선착순 실패는 409 다.
        */
        const code = (error.response?.data as { code?: string } | undefined)
          ?.code
        const isAlreadyAccepted =
          code === 'CONSULTATION_ALREADY_ACCEPTED' ||
          (code === undefined && error.response?.status === 409)

        return isAlreadyAccepted
          ? ACCEPT_FAILURE.ALREADY_ACCEPTED
          : ACCEPT_FAILURE.UNKNOWN
      } finally {
        setPendingId(null)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.consultation.all,
        })
      }
    },
    [queryClient, startSession],
  )

  return { accept, pendingId }
}
