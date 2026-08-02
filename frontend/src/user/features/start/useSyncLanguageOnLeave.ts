import { useEffect, useRef } from 'react'

import { userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useLanguage } from '@/shared/lib/useLanguage'
import { toLangCode } from '@/user/features/auth/lib/language'

/**
 * 시작 페이지를 벗어날 때 변경된 선호 언어를 서버에 저장한다.
 * (PATCH /users/language, 백엔드 개발완료)
 *
 * 칩을 누를 때마다 보내지 않는 이유 — 언어를 이것저것 눌러보는 화면이라
 * 요청이 선택 횟수만큼 나간다. 서버가 기억할 가치가 있는 것은 "떠날 때의
 * 최종 선택"뿐이므로, 언마운트 시점에 마운트 시점과 달라졌을 때만 1회 보낸다.
 *
 * 역할 구분:
 *   - 비로그인: 아무것도 안 보낸다. i18next 가 localStorage(app_language)에
 *     저장하므로 전역 언어 상태는 이미 모든 페이지에서 읽힌다.
 *   - 로그인: 위 저장에 더해 서버 DB 동기화가 필요하므로 PATCH 를 보낸다.
 *     로그인 여부는 언마운트 "시점"의 스토어 값으로 판정한다. (렌더 시점
 *     클로저를 쓰면 페이지에 머무는 동안 로그아웃한 경우를 놓친다)
 *
 * 실패는 무시한다. 화면 언어는 이미 로컬에 반영돼 사용자 경험에 지장이 없고,
 * 다음 로그인 때 서버 값으로 다시 맞춰진다.
 *
 * 한계: 시작 페이지에서 탭을 바로 닫으면 언마운트가 돌지 않아 서버에 남지
 * 않는다. sendBeacon 은 Authorization 헤더를 못 실어 지금은 넣지 않는다.
 */
export function useSyncLanguageOnLeave(): void {
  const { language } = useLanguage()

  // 언마운트 클로저가 마지막 렌더의 언어를 읽도록 ref 로 우회한다.
  const latestRef = useRef(language)
  latestRef.current = language

  useEffect(() => {
    // 마운트 시점 언어 = 서버가 알고 있(다고 볼 수 있)는 기준값.
    // 로그인 응답의 language 가 이미 changeLanguage 로 반영된 뒤이므로,
    // 여기서 잡은 값과 다르면 "이번 방문에서 사용자가 바꾼 것"이다.
    const baseline = latestRef.current

    return () => {
      const next = latestRef.current
      if (next === baseline) return
      if (useAuthStore.getState().status.user !== 'authenticated') return

      // fire-and-forget. 이탈 중이라 결과를 화면에 반영할 곳도 없다.
      void userApi
        .patch(endpoints.users.language, { language: toLangCode(next) })
        .catch(() => {
          // 실패해도 로컬 언어는 유효하다. 다음 로그인 때 서버 값과 재동기화된다.
        })
    }
  }, [])
}
