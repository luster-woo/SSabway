import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useHelpChatStore } from '@/shared/lib/store/useHelpChatStore'
import { MobileViewport } from '@/shared/ui'
import { useConsultationRequest } from '@/user/features/consultation/useConsultationRequest'
import { BotBubble } from '@/user/features/help-chat/BotBubble'
import { HelpChatHeader } from '@/user/features/help-chat/HelpChatHeader'

/** 좌우 여백 — MobileScreen의 GUTTER와 같은 값 */
const GUTTER = 'px-[clamp(16px,5vw,24px)]'

/**
 * 7. 도움 요청(SSabway 도우미) — 경로 안내 중 도움 요청을 누르면 오는 화면.
 *
 * 챗봇처럼 보이지만 자유 입력은 없고 버튼 클릭으로만 진행된다.
 *
 * 1) 처음: "무엇을 도와드릴까요?" + [역무원과 화상 연결]
 * 2) 버튼 클릭 · 비로그인: "화상 연결은 로그인이 필요해요." + [로그인하고 화상 연결] → /login
 * 3) 로그인을 마치고 돌아오면(또는 로그인 상태로 클릭): 연결 준비 안내 + [화상 연결] → /consultation
 *
 * 클릭 여부는 스토어에 있어 로그인을 다녀와도(리마운트) 3) 상태가 유지된다.
 */
export default function HelpChatPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const isAuthenticated = useAuthStore(
    (state) => state.status.user === 'authenticated',
  )
  const hasRequested = useHelpChatStore((state) => state.hasRequestedConnection)
  const requestConnection = useHelpChatStore((state) => state.requestConnection)
  const resetConversation = useHelpChatStore((state) => state.resetConversation)
  const { requestConsultation, isPending } = useConsultationRequest()

  /** 화면을 떠날 때는 대화를 처음으로 되돌린다. */
  const leaveTo = (path: string) => {
    resetConversation()
    void navigate(path)
  }

  const goLogin = () => {
    // 로그인 성공 시 LoginPage가 히스토리를 한 칸 되돌려 이 화면으로 돌아온다.
    void navigate('/login')
  }

  /**
   * 상담을 요청하고 화상 화면으로 넘어간다.
   *
   * 요청 API 가 아직 없어 지금은 항상 null 이 오고, 그때는 상담 ID 없이 이동해
   * 화상 화면이 안내 문구를 띄운다. API 가 붙으면 발급받은 ID 를 실어 보낸다.
   */
  const startVideoCall = async () => {
    const consultationId = await requestConsultation()

    void navigate(
      consultationId === null
        ? '/consultation'
        : `/consultation?consultationId=${String(consultationId)}`,
    )
  }

  return (
    <MobileViewport className="bg-surface-soft flex flex-col">
      <HelpChatHeader onBack={() => void navigate(-1)} />

      <main className={`${GUTTER} flex flex-1 flex-col gap-4 overflow-y-auto py-5`}>
        <BotBubble>{t('helpChat.greeting')}</BotBubble>

        {/* 사용자 쪽 선택지. 누르고 나면 보낸 말풍선처럼 남는다. */}
        {hasRequested ? (
          <p className="bg-brand-gradient self-end rounded-full px-7 py-3 text-[14px] font-bold text-white">
            {t('helpChat.connectStaff')}
          </p>
        ) : (
          <button
            type="button"
            onClick={requestConnection}
            className="bg-brand-gradient focus-visible:ring-brand self-end rounded-full px-7 py-3 text-[14px] font-bold text-white shadow-sm transition active:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t('helpChat.connectStaff')}
          </button>
        )}

        {hasRequested && !isAuthenticated ? (
          <>
            <BotBubble>{t('helpChat.loginRequired')}</BotBubble>
            <button
              type="button"
              onClick={goLogin}
              className="border-brand bg-surface text-brand-dark focus-visible:ring-brand mx-auto mt-1 h-[52px] w-[82%] rounded-full border-[1.6px] text-[14.5px] font-bold transition active:brightness-95 focus-visible:ring-2 focus-visible:outline-none"
            >
              {t('helpChat.loginAndConnect')}
            </button>
          </>
        ) : null}

        {hasRequested && isAuthenticated ? (
          <>
            <BotBubble>{t('helpChat.ready')}</BotBubble>
            <div className="mt-1 flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => void startVideoCall()}
                className="bg-brand-gradient focus-visible:ring-brand h-[52px] w-[82%] rounded-2xl text-[15px] font-bold text-white shadow-sm transition active:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
              >
                {t('helpChat.connect')}
              </button>
              <p className="text-ink-faint text-[11.5px]">
                {t('helpChat.recordNotice')}
              </p>
            </div>
          </>
        ) : null}
      </main>

      <footer
        className={`${GUTTER} border-line bg-surface flex shrink-0 gap-2.5 border-t pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]`}
      >
        <button
          type="button"
          onClick={() => leaveTo('/guide')}
          className="border-line bg-surface text-ink focus-visible:ring-brand h-11 flex-1 rounded-2xl border text-[13px] transition active:brightness-95 focus-visible:ring-2 focus-visible:outline-none"
        >
          {t('helpChat.backToGuide')}
        </button>
        <button
          type="button"
          onClick={() => leaveTo('/')}
          className="border-line bg-surface text-ink focus-visible:ring-brand h-11 flex-1 rounded-2xl border text-[13px] transition active:brightness-95 focus-visible:ring-2 focus-visible:outline-none"
        >
          {t('common.goHome')}
        </button>
      </footer>
    </MobileViewport>
  )
}
