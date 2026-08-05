import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'
import { TutorialModal } from '@/user/features/tutorial/TutorialModal'

/**
 * 위젯을 띄울 페이지와, 그 페이지에서의 세로 위치.
 *
 * 여기 없는 경로에는 그리지 않는다 — 화상 상담(/consultation)과 도움 요청
 * 챗봇(/help)은 통화·대화를 가리면 안 되고, 시작(/)은 전용 배너
 * (TutorialGuideBanner)가 이미 있다. 로그인·가입·도착 화면은 안내가 필요한
 * 맥락이 아니라 뺐다.
 *
 * 기본 자리는 **왼쪽 가장자리 · 세로 중앙**이다. 다섯 페이지의 아래쪽
 * (CTA·촬영 컨트롤·장소 카드)과 위쪽(헤더·검색바)이 모두 차 있어, 어느
 * 페이지에서도 기존 요소를 가리지 않는 자리가 좌중앙뿐이다.
 * 완전히 같은 좌표일 필요는 없어서(팀 결정 8/5) 페이지 요소와 겹치면
 * 이 표에서 그 페이지만 살짝 올리거나 내린다.
 */
const FAB_POSITION: Record<string, string> = {
  '/scan': 'top-1/2',
  '/destination': 'top-1/2',
  '/route': 'top-1/2',
  '/user-info': 'top-1/2',
  '/guide': 'top-1/2',
}

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
 * UserApp 에 **한 번만** 마운트한다. 페이지마다 심으면 다섯 화면의 레이아웃
 * (MobileScreen/MobileViewport, 헤더·푸터 유무)이 제각각이라 같은 자리를
 * 보장할 수 없다. 대신 폰 규격 컬럼(max-w-[430px])을 그대로 재현한 fixed
 * 오버레이 안에 절대 배치한다 — 설치 유도 시트(InstallPromptSheet)와 같은
 * 방식이라 데스크톱에서도 컬럼 밖으로 나가지 않는다.
 *
 * z-index 는 30: 페이지 콘텐츠(≤20) 위, 설치 시트(40)·모달(50) 아래.
 * 촬영 화면의 어두운 배경 위에서도 보이도록 흰 바탕 + 그림자를 쓴다.
 */
export function TutorialFab() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const position = FAB_POSITION[pathname]
  if (!position) return null

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
            className={cn(
              'pointer-events-auto absolute left-2 -translate-y-1/2',
              position,
              'bg-surface/95 border-line text-brand-dark flex size-11 flex-col items-center justify-center rounded-full border shadow-[0_4px_12px_rgba(15,23,42,0.18)] backdrop-blur-sm',
              'focus-visible:ring-brand transition focus-visible:ring-2 focus-visible:outline-none active:scale-95',
            )}
          >
            <QuestionIcon className="size-5" />
          </button>
        </div>
      </div>

      {isOpen ? <TutorialModal onClose={() => setIsOpen(false)} /> : null}
    </>
  )
}
