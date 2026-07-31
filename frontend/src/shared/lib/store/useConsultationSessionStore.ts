import { create } from 'zustand'

import type { ConsultationSession } from '@/shared/types'

/**
 * 진행 중인 화상 상담의 접속 정보.
 *
 * 서버 데이터가 아니라 "이번 탭이 지금 붙어 있는 세션"이라 Zustand 에 둔다.
 * TanStack Query 에 넣으면 캐시 무효화 타이밍에 통화가 끊긴다.
 *
 * 대기 목록 화면에서 수락 → 상담 화면으로 넘어가는 사이에 sessionId·token 을
 * 실어 나르는 용도다. 화면 간 라우팅 state 로 넘기지 않는 이유는
 * 새로고침·뒤로가기에서 조용히 사라지기 때문이다.
 *
 * 메모리에만 있으므로 새로고침하면 비어 있다. 그때는 상담 화면이 세션 ID 규칙으로
 * 복원해 다시 접속한다. (shared/api/openvidu 의 joinSession)
 */
interface ConsultationSessionState {
  session: ConsultationSession | null
  startSession: (session: ConsultationSession) => void
  /** 통화가 끝났거나 화면을 벗어날 때 */
  clearSession: () => void
}

export const useConsultationSessionStore = create<ConsultationSessionState>(
  (set) => ({
    session: null,
    startSession: (session) => set({ session }),
    clearSession: () => set({ session: null }),
  }),
)
