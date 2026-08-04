import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AdminProfileState {
  /**
   * 로그인한 관리자의 staffCode. 로그인 아이디에 해당하는 값이라 헤더에 그대로 표시한다.
   * 비밀값이 아니다 — 비밀번호도 토큰도 아닌 사번이다.
   */
  staffCode: string | null
  setStaffCode: (staffCode: string) => void
  clearStaffCode: () => void
}

/**
 * 관리자 프로필.
 *
 * useAuthStore 는 user·admin 공용이라 관리자 전용 필드를 넣지 않고 여기서 따로 들고 있다.
 *
 * ⚠️ sessionStorage 에 저장한다. 메모리에만 두면 **새로고침 한 번에 헤더의
 *    사번이 사라진다** — 액세스 토큰은 리프레시 쿠키로 되살아나(restoreSession)
 *    로그인 상태는 유지되는데, staffCode 는 되살릴 경로가 없기 때문이다.
 *    로그인 응답(`POST /staffs/login` 의 data.staffCode)만이 이 값을 주고,
 *    액세스 토큰의 클레임에는 없다 — BE JwtProvider 가 subject 로 staff **id**
 *    를 싣기 때문에(`createAccessToken(staff.getId(), ...)`) 토큰을 디코드해도
 *    사번을 알 수 없다. `/staffs/me` 는 신설하지 않기로 했으므로, 새로고침을
 *    견디려면 프론트가 직접 들고 있어야 한다.
 *
 *    localStorage 가 아니라 sessionStorage 인 이유: 역무실 공용 PC 를 전제하므로
 *    탭을 닫으면 함께 사라지는 쪽이 맞다. 로그아웃 때도 clearStaffCode 로
 *    지운다(AdminMainPage). 세션 복구가 실패하면 RequireAdminAuth 가 지운다 —
 *    토큰이 없는데 남의 사번이 헤더에 남아 있으면 안 된다.
 */
export const useAdminProfileStore = create<AdminProfileState>()(
  persist(
    (set) => ({
      staffCode: null,
      setStaffCode: (staffCode) => set({ staffCode }),
      clearStaffCode: () => set({ staffCode: null }),
    }),
    {
      name: 'ssabway:admin-profile',
      storage: createJSONStorage(() => sessionStorage),
      // 함수(setter)는 저장할 필요가 없다. 값만 남긴다.
      partialize: (state) => ({ staffCode: state.staffCode }),
    },
  ),
)
