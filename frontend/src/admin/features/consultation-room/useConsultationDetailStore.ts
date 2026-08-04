import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { ConsultationDetail } from '@/admin/features/consultation-room/useConsultationDetail'

interface ConsultationDetailState {
  /** 수락한 상담의 정보. null 이면 수락을 거치지 않았다(직접 URL 진입 등). */
  detail: ConsultationDetail | null
  setDetail: (detail: ConsultationDetail) => void
  /** 상담이 끝났을 때. 다음 상담의 정보와 섞이면 안 된다. */
  clearDetail: () => void
}

/**
 * 역무원이 수락한 상담의 정보(이메일·출발지·목적지·언어).
 *
 * 수락 화면(WaitingPanel) → 상담 화면(AdminConsultationPage)으로 넘기는
 * 용도다. 라우팅 state 로 넘기지 않는 이유는 새로고침·뒤로가기에서 조용히
 * 사라지기 때문이다 — 세션 정보를 useConsultationSessionStore 로 넘기는
 * 것과 같은 이유. (팀 방침: 화면 간 데이터 전달에 라우팅 state 지양)
 *
 * ⚠️ sessionStorage 에 저장한다. 메모리에만 두면 상담 중 새로고침 한 번에
 *    상담 정보가 사라지는데, 이를 복구할 서버 조회
 *    (GET /staffs/consultations/{id})가 아직 BE 신설 대기(8/4)라 화면이
 *    "불러오지 못했습니다"로 굳는다. 특히 블랙리스트 등록이 이 email 로
 *    나가므로 잃어버리면 안 된다.
 *
 *    localStorage 가 아니라 sessionStorage 인 이유: 역무실 공용 PC 를
 *    전제하므로 탭을 닫으면 함께 사라지는 쪽이 맞다(useAdminProfileStore 와
 *    같은 판단). 상담이 끝난 정보는 어차피 유효하지 않다.
 *
 * 상담 화면은 URL 의 consultationId 와 일치할 때만 이 값을 쓴다 —
 * 지난 상담의 잔여 값이 다른 상담에 섞이면 안 된다(useConsultationDetail).
 */
export const useConsultationDetailStore = create<ConsultationDetailState>()(
  persist(
    (set) => ({
      detail: null,
      setDetail: (detail) => set({ detail }),
      clearDetail: () => set({ detail: null }),
    }),
    {
      name: 'ssabway:admin-consultation-detail',
      storage: createJSONStorage(() => sessionStorage),
      // 함수(setter)는 저장할 필요가 없다. 값만 남긴다.
      partialize: (state) => ({ detail: state.detail }),
    },
  ),
)
