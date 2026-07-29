import { useTranslation } from 'react-i18next'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { Button, MobileScreen, ToastProvider } from '@/shared/ui'
import ConsultationPage from '@/user/pages/ConsultationPage'
import DestinationPage from '@/user/pages/DestinationPage'
import RoutePage from '@/user/pages/RoutePage'
import SignCapturePage from '@/user/pages/SignCapturePage'
import StartPage from '@/user/pages/StartPage'
import UserInfoPage from '@/user/pages/UserInfoPage'

/**
 * 아직 구현되지 않은 화면 자리. 라우트와 화면을 1:1로 유지해
 * 뒤로가기 동작이 어긋나지 않도록 한다.
 * TODO: auth / arrival 화면이 붙으면 각 Route를 실제 페이지로 교체
 */
function PlaceholderScreen() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <MobileScreen
      footer={
        <Button size="lg" fullWidth onClick={() => void navigate('/')}>
          {t('common.goHome')}
        </Button>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-ink text-base font-bold">{t('common.notReady')}</p>
        <p className="text-ink-muted text-[13px]">{pathname}</p>
      </div>
    </MobileScreen>
  )
}

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
        {/* TODO: 로그인·회원가입 화면으로 교체 */}
        <Route path="login" element={<PlaceholderScreen />} />
        <Route path="consultation" element={<ConsultationPage />} />
        {/* TODO: 도착 완료 화면으로 교체. 통화 종료 후 돌아올 자리다. */}
        <Route path="arrival" element={<PlaceholderScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
