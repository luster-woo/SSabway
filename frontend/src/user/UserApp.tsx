import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useRestoreSession } from '@/shared/api/useRestoreSession'
import { RouteLoading, ToastProvider } from '@/shared/ui'
import ArrivalPage from '@/user/pages/ArrivalPage'
import DestinationPage from '@/user/pages/DestinationPage'
import HelpChatPage from '@/user/pages/HelpChatPage'
import LoginPage from '@/user/pages/LoginPage'
import NotFoundPage from '@/user/pages/NotFoundPage'
import PasswordResetPage from '@/user/pages/PasswordResetPage'
import RouteGuidePage from '@/user/pages/RouteGuidePage'
import RoutePage from '@/user/pages/RoutePage'
import SignCapturePage from '@/user/pages/SignCapturePage'
import SignUpPage from '@/user/pages/SignUpPage'
import StartPage from '@/user/pages/StartPage'
import UserInfoPage from '@/user/pages/UserInfoPage'

/**
 * 화상 상담만 lazy 로 뺀다.
 *
 * 다른 user 페이지는 오프라인 진입을 보장하려고 메인 청크에 두지만, 이 화면은
 * openvidu-browser(약 420kB)를 끌고 오고 통화 자체가 네트워크 없이는 성립하지
 * 않는다. 그래서 도움 요청까지 간 사용자만 내려받게 한다.
 *
 * vite.config.ts 의 globIgnores 에 있는 browser 청크 제외 규칙과 짝이다.
 * 한쪽만 바꾸면 조용히 깨진다.
 */
const ConsultationPage = lazy(() => import('@/user/pages/ConsultationPage'))

/** user(PWA) 앱의 라우트 루트. 시작 페이지가 진입점이다. */
export default function UserApp() {
  /*
    새로고침·앱 재시작으로 잃은 로그인 상태를 여기서 되살린다.

    화면 전체를 막지 않는 이유는 오프라인 진입 때문이다. 이 앱은 지하에서
    네트워크 없이도 열려야 하는데, 복구 응답을 기다리며 렌더를 미루면
    요청이 타임아웃(10초)날 때까지 아무것도 보이지 않는다.

    대신 인증 여부로 갈리는 화면(StartPage·HelpChatPage)이 status 'idle' 을
    로딩으로 취급한다. 그쪽을 수정하지 않고 새 화면을 추가하면 새로고침 직후
    비로그인 UI 가 잠깐 보이므로 주의할 것.
  */
  useRestoreSession('user')

  return (
    <ToastProvider>
      <Routes>
        <Route index element={<StartPage />} />
        <Route path="scan" element={<SignCapturePage />} />
        <Route path="destination" element={<DestinationPage />} />
        <Route path="route" element={<RoutePage />} />
        {/* 안내 정보 확인(출발·도착 + 교통카드 여부). 경로 선택 다음 화면이다. */}
        <Route path="user-info" element={<UserInfoPage />} />
        {/* 경로 상세 안내(역 내 표지판 단계별 안내) */}
        <Route path="guide" element={<RouteGuidePage />} />
        {/* 도움 요청(버튼 클릭형 도우미). 경로 안내의 도움 요청에서 진입한다. */}
        <Route path="help" element={<HelpChatPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="password-reset" element={<PasswordResetPage />} />
        <Route
          path="consultation"
          element={
            <Suspense fallback={<RouteLoading />}>
              <ConsultationPage />
            </Suspense>
          }
        />
        {/* 도착 완료. 안내 종료·통화 종료 후 돌아올 자리다. */}
        <Route path="arrival" element={<ArrivalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  )
}
