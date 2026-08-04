import { useEffect } from 'react'

import { restoreSession } from '@/shared/api/client'
import { hasSessionHint } from '@/shared/lib/sessionHint'
import {
  useAuthStore,
  type AuthRole,
  type AuthStatus,
} from '@/shared/lib/store/useAuthStore'

/**
 * 부팅 시 세션을 복구하고 현재 판정 상태를 돌려준다.
 *
 * 액세스 토큰은 메모리에만 있으므로 새로고침하면 사라진다. 리프레시 토큰은
 * HttpOnly 쿠키로 남아 있으니, 앱이 뜰 때 한 번 재발급을 시도해야 로그인
 * 상태가 유지된다. 그 한 번을 여는 것이 이 훅이다.
 *
 * 단, 로그인한 적이 없으면 시도하지 않는다. 이 앱은 UserApp 이 모든 경로의
 * 루트라(app/router.tsx) 처음 들어온 사용자도, /login 을 열어 둔 사용자도
 * 이 훅을 지나간다. 표식(sessionHint)을 보고 거를 수 있으면 걸러야 첫 접속마다
 * 401 나는 재발급 요청이 사라지고, 응답을 기다리지 않으니 첫 화면도 빨라진다.
 *
 * 반환값을 그대로 쓰지 말고 세 상태를 구분해서 다뤄야 한다.
 *   - 'idle'            판정 전. "비로그인" 이 아니다. 로딩으로 취급할 것.
 *   - 'authenticated'   복구 성공
 *   - 'unauthenticated' 복구 실패(쿠키 없음·만료) 또는 로그인한 적 없음
 *
 * idle 을 비로그인으로 처리하면 새로고침 직후 로그인 버튼이 잠깐 보였다가
 * 아바타로 바뀌거나, 인증 가드가 로그인 화면으로 튕겨 버린다.
 *
 * 앱 루트에서 한 번만 부르면 되지만, 여러 곳에서 불러도 안전하다.
 * status 가 'idle' 일 때만 요청하고, 겹친 요청은 refreshAccessToken 이 합친다.
 * (StrictMode 의 이중 마운트도 여기서 흡수된다)
 */
export function useRestoreSession(role: AuthRole): AuthStatus {
  const status = useAuthStore((s) => s.status[role])

  useEffect(() => {
    // 구독 중인 status 가 아니라 최신 값을 직접 읽는다. 이 이펙트는 role 만
    // 의존하므로, 렌더 시점의 status 를 닫아 두면 오래된 값으로 판단하게 된다.
    if (useAuthStore.getState().status[role] !== 'idle') return

    /*
      복구를 건너뛸 때도 판정은 반드시 끝내야 한다.

      StartPage·HelpChatPage·RequireAdminAuth 는 'idle' 을 비로그인이 아니라
      "아직 모름"(로딩)으로 다룬다. 요청만 생략하고 'idle' 로 두면 처음 들어온
      사용자가 로딩 화면에서 영원히 빠져나오지 못한다.
    */
    if (!hasSessionHint(role)) {
      useAuthStore.getState().setStatus(role, 'unauthenticated')
      return
    }

    void restoreSession(role)
  }, [role])

  return status
}
