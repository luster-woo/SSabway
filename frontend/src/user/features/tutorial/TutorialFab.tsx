import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { TutorialModal } from '@/user/features/tutorial/TutorialModal'

/**
 * 위젯을 띄울 페이지.
 *
 * 여기 없는 경로에는 그리지 않는다.
 *   `/`             전용 배너(TutorialGuideBanner)가 이미 있다
 *   `/scan`         카메라 뷰파인더를 가린다 (8/5 제외)
 *   `/destination`  지도를 가린다 (8/5 제외)
 *   `/consultation` 통화 화면을 가린다
 *   `/help`         도움 요청 챗봇 — 대화를 가린다
 *   로그인·가입·도착  안내가 필요한 맥락이 아니다
 *
 * 남은 세 페이지는 모두 MobileScreen 기반이고 헤더 오른쪽이 비어 있어
 * **우측 상단 한 자리**로 통일된다. (`/guide` 만 경로 재탐색 버튼이 그 자리에
 * 있었는데, RouteGuidePage 에서 `mr-12` 로 왼쪽으로 밀어 자리를 비웠다 —
 * 한쪽만 위치를 다르게 두면 화면을 옮길 때마다 아이콘을 다시 찾게 된다)
 */
const TUTORIAL_FAB_PATHS: readonly string[] = ['/route', '/user-info', '/guide']

/**
 * 세로 위치 — 각 페이지 헤더의 뒤로가기 버튼과 같은 줄.
 *
 * MobileScreen 헤더가 `pt-[calc(safe+0.75rem)]`(12px)이고 뒤로가기가 32px 이라
 * 그 줄의 한가운데가 safe+28px 다. `-translate-y-1/2` 와 함께 쓴다.
 */
const FAB_TOP = 'top-[calc(env(safe-area-inset-top,0px)+1.75rem)]'

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.2 9.2a2.9 2.9 0 1 1 3.9 2.7c-.8.3-1.1.9-1.1 1.7v.4" />
      <path d="M12 17.4h.01" />
    </svg>
  )
}

/**
 * 사용법 안내 플로팅 위젯 — 시작 페이지 밖에서도 튜토리얼을 다시 본다.
 *
 * UserApp 에 **한 번만** 마운트한다. 페이지마다 심으면 화면들의 레이아웃
 * (MobileScreen/MobileViewport, 헤더·푸터 유무)이 제각각이라 같은 자리를
 * 보장할 수 없다. 대신 폰 규격 컬럼(max-w-[430px])을 그대로 재현한 fixed
 * 오버레이 안에 절대 배치한다 — 설치 유도 시트(InstallPromptSheet)와 같은
 * 방식이라 데스크톱에서도 컬럼 밖으로 나가지 않는다.
 *
 * 오른쪽 여백(`right-3`, 12px)은 헤더 뒤로가기 버튼의 왼쪽 여백(13.5px)과
 * 맞춘 값이다 — 좌우가 대칭으로 보인다.
 *
 * z-index 는 30: 페이지 콘텐츠(≤20) 위, 설치 시트(40)·모달(50) 아래.
 */
export function TutorialFab() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  if (!TUTORIAL_FAB_PATHS.includes(pathname)) return null

  return (
    <>
      {/* 컬럼만 재현하는 오버레이 — 버튼 외에는 탭을 통과시킨다 */}
      <div
        aria-hidden={isOpen}
        className="pointer-events-none fixed inset-0 z-30 flex justify-center"
      >
        <div className="relative w-full max-w-[430px]">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={t('start.tutorial.title')}
            className={`pointer-events-auto absolute right-3 ${FAB_TOP} bg-surface/95 border-brand/60 text-brand-dark focus-visible:ring-brand flex size-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-[0_4px_12px_rgba(15,23,42,0.18)] backdrop-blur-sm transition focus-visible:ring-2 focus-visible:outline-none active:scale-95`}
          >
            <QuestionIcon className="size-5" />
          </button>
        </div>
      </div>

      {isOpen ? <TutorialModal onClose={() => setIsOpen(false)} /> : null}
    </>
  )
}
