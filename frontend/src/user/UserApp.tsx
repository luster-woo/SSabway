import { Navigate, Route, Routes } from 'react-router-dom'

import { ToastProvider } from '@/shared/ui'
import ArrivalPage from '@/user/pages/ArrivalPage'
import ConsultationPage from '@/user/pages/ConsultationPage'
import DestinationPage from '@/user/pages/DestinationPage'
import HelpChatPage from '@/user/pages/HelpChatPage'
import LoginPage from '@/user/pages/LoginPage'
import RouteGuidePage from '@/user/pages/RouteGuidePage'
import PasswordResetPage from '@/user/pages/PasswordResetPage'
import RoutePage from '@/user/pages/RoutePage'
import SignCapturePage from '@/user/pages/SignCapturePage'
import StartPage from '@/user/pages/StartPage'
import UserInfoPage from '@/user/pages/UserInfoPage'

/** user(PWA) 앱의 라우트 루트. 시작 페이지가 진입점이다. */
export default function UserApp() {
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
        <Route path="password-reset" element={<PasswordResetPage />} />
        <Route path="consultation" element={<ConsultationPage />} />
        {/* 도착 완료. 안내 종료·통화 종료 후 돌아올 자리다. */}
        <Route path="arrival" element={<ArrivalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
