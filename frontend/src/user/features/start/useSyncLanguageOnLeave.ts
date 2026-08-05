import { useEffect, useRef } from 'react'

import { sendKeepalivePatch, userApi } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useLanguage } from '@/shared/lib/useLanguage'
import { toLangCode } from '@/user/features/auth/lib/language'

/**
 * 시작 페이지에서 바꾼 선호 언어를 서버에 저장한다.
 * (PATCH /users/language, 백엔드 개발완료)
 *
 * 칩을 누를 때마다 보내지 않는 이유 — 언어를 이것저것 눌러보는 화면이라
 * 요청이 선택 횟수만큼 나간다. 서버가 기억할 가치가 있는 것은 "이 화면을
 * 떠날 때의 최종 선택"뿐이므로, 떠나는 시점에 마지막으로 보낸 값과 달라졌을
 * 때만 1회 보낸다.
 *
 * "떠나는 시점" 은 세 가지이고 셋 다 잡아야 한다.
 *   - 언마운트: 다른 화면으로 이동. 응답을 받을 수 있으니 평소 클라이언트로 보낸다.
 *   - pagehide: 탭 닫기·뒤로가기·주소창 이동·bfcache 진입.
 *   - visibilitychange(hidden): 모바일에서 앱을 전환한 뒤 브라우저가 그대로
 *     종료되는 경로. iOS 는 이 뒤에 pagehide 가 오지 않을 수 있다.
 *
 * 뒤의 둘은 언마우트가 돌지 않으므로 XHR 로는 못 보낸다(취소된다).
 * fetch keepalive 를 쓰는 sendKeepalivePatch 로 보낸다.
 *
 * 역할 구분:
 *   - 비로그인: 아무것도 안 보낸다. i18next 가 localStorage(app_language)에
 *     저장하므로 다음 접속에도 마지막 선택이 그대로 뜬다.
 *   - 로그인: 위 저장에 더해 서버 DB 동기화가 필요하므로 PATCH 를 보낸다.
 *     로그인 여부는 보내는 "시점"의 스토어 값으로 판정한다. (렌더 시점
 *     클로저를 쓰면 페이지에 머무는 동안 로그아웃한 경우를 놓친다)
 *
 * 서버 저장이 왜 중요한가 — 로그인 응답의 language 가 화면 언어를 덮는다
 * (useUserLogin). 서버에 옛 값이 남아 있으면 다음 로그인에서 사용자가 고른
 * 언어가 옛 값으로 되돌아간다. 그래서 이탈 경로마다 빠짐없이 보내야 한다.
 *
 * 실패는 무시한다. 화면 언어는 이미 localStorage 에 반영돼 있어 사용자
 * 경험에는 지장이 없다.
 */
export function useSyncLanguageOnLeave(): void {
  const { language } = useLanguage()

  // 이탈 시점의 콜백이 마지막 렌더의 언어를 읽도록 ref 로 우회한다.
  const latestRef = useRef(language)
  latestRef.current = language

  useEffect(() => {
    /*
      서버가 알고 있(다고 볼 수 있)는 값.

      마운트 시점 언어가 기준이다. 로그인 응답의 language 가 이미
      changeLanguage 로 반영된 뒤이므로, 이 값과 달라졌다면 "이번 방문에서
      사용자가 바꾼 것"이다. 보낼 때마다 갱신해 같은 값을 두 번 보내지 않는다.
      (visibilitychange 로 한 번 보낸 뒤 언마운트가 또 보내는 것을 막는다)
    */
    let synced = latestRef.current

    const flush = (leaving: boolean) => {
      const next = latestRef.current
      if (next === synced) return
      if (useAuthStore.getState().status.user !== 'authenticated') return

      synced = next
      const body = { language: toLangCode(next) }

      if (leaving) {
        sendKeepalivePatch('user', endpoints.users.language, body)
        return
      }

      // fire-and-forget. 이동 중이라 결과를 화면에 반영할 곳도 없다.
      void userApi.patch(endpoints.users.language, body).catch(() => {
        // 실패해도 로컬 언어는 유효하다. 다음 로그인 때 서버 값과 재동기화된다.
      })
    }

    const onPageHide = () => flush(true)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush(true)
    }

    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flush(false)
    }
  }, [])
}
