import { create } from 'zustand'

interface AdminProfileState {
  /**
   * 로그인한 관리자의 staffCode. 로그인 아이디에 해당하는 값이라 헤더에 그대로 표시한다.
   * 토큰과 마찬가지로 메모리에만 두고 영속화하지 않는다.
   */
  staffCode: string | null
  setStaffCode: (staffCode: string) => void
  clearStaffCode: () => void
}

/**
 * 관리자 프로필.
 *
 * useAuthStore 는 user·admin 공용이라 관리자 전용 필드를 넣지 않고 여기서 따로 들고 있다.
 * TODO: /me 계열 엔드포인트가 생기면 이 스토어 대신 서버 조회로 대체한다.
 */
export const useAdminProfileStore = create<AdminProfileState>((set) => ({
  staffCode: null,
  setStaffCode: (staffCode) => set({ staffCode }),
  clearStaffCode: () => set({ staffCode: null }),
}))
