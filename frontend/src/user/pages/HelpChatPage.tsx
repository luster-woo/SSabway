import { useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useHelpChatStore } from '@/shared/lib/store/useHelpChatStore'
import { MobileViewport, useToast } from '@/shared/ui'
import { useConsultationRequest } from '@/user/features/consultation/useConsultationRequest'
import { useConsultationWaiting } from '@/user/features/consultation/useConsultationWaiting'
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
 * 3) 로그인을 마치고 돌아오면(또는 로그인 상태로 클릭): 연결 준비 안내 + [화상 연결]
 * 4) [화상 연결] 클릭: 페이지 이동 없이 버튼 자리에 스피너 + [취소] 표시(대기 상태).
 *    상담을 요청하고(POST /consultations) 받은 ID 를 3초 폴링해 매칭을 기다린다.
 *    - 취소를 누르면 대기 취소(POST /consultations/{id}/cancel) 후 3) 으로 되돌아간다.
 *    - 매칭되면(MATCHED) `/consultation?consultationId=...` 로 넘어간다. 접속
 *      토큰은 여기서 받지 않는다 — 화상 화면이 카메라 권한을 얻은 뒤에 받는다.
 *    - 취소·거절 없이 매칭 실패(대기 중 오류·취소된 상담 등)로 끝나면 안내
 *      토스트를 띄우고 버튼 상태로 되돌린다.
 *
 * 클릭 여부는 스토어에 있어 로그인을 다녀와도(리마운트) 3) 상태가 유지된다.
 * 이 화면을 벗어나면(뒤로가기·경로 안내로·처음으로) 대기 중이던 상담은 그대로
 * 두고 화면 상태만 리셋한다 — 취소하려면 반드시 [취소] 버튼을 눌러야 한다.
 */
export default function HelpChatPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  /*
    'idle' 은 비로그인이 아니라 "아직 모름" 이다. (UserApp 의 useRestoreSession)
    이 화면에서 직접 새로고침했을 때, 판정 전에 "로그인이 필요해요" 를 띄우면
    이미 로그인한 사용자를 로그인 화면으로 보내게 된다.
  */
  const authStatus = useAuthStore((state) => state.status.user)
  const isAuthenticated = authStatus === 'authenticated'
  const isAuthPending = authStatus === 'idle'
  const hasRequested = useHelpChatStore((state) => state.hasRequestedConnection)
  const requestConnection = useHelpChatStore((state) => state.requestConnection)
  const resetConversation = useHelpChatStore((state) => state.resetConversation)
  const {
    requestConsultation,
    cancelConsultation,
    isPending,
    isRejected,
    isRouteMissing,
  } = useConsultationRequest()

  /**
   * 발급받은 상담 ID. null 이 아니면 대기 중 — 연결 버튼 대신
   * 스피너 + 취소 버튼을 띄운다. (요청 응답을 기다리는 아주 짧은 순간은
   * isPending 으로 같은 UI를 보여준다)
   */
  const [consultationId, setConsultationId] = useState<number | null>(null)
  const isWaiting = isPending || consultationId !== null

  const waiting = useConsultationWaiting(consultationId)

  // 매칭되면 화상 화면으로. 토큰은 그 화면이 카메라 권한을 얻은 뒤 따로 받는다.
  useEffect(() => {
    if (consultationId !== null && waiting.isMatched) {
      void navigate(`/consultation?consultationId=${String(consultationId)}`)
    }
  }, [consultationId, navigate, waiting.isMatched])

  // 요청이 거절되면(블랙리스트 403 등) 대기 상태를 풀고 버튼으로 되돌린다.
  useEffect(() => {
    if (isRejected) setConsultationId(null)
  }, [isRejected])

  // 대기 중 취소되거나 실패하면(서버 사정) 안내하고 버튼으로 되돌린다.
  useEffect(() => {
    if (consultationId === null || !waiting.isFailed) return
    setConsultationId(null)
    showToast(t('consultation.unavailable'))
  }, [consultationId, showToast, t, waiting.isFailed])

  /** 화면을 떠날 때는 대화를 처음으로 되돌린다. (대기 중인 상담은 그대로 둔다) */
  const leaveTo = (path: string) => {
    resetConversation()
    void navigate(path)
  }

  const goLogin = () => {
    // 로그인 성공 시 LoginPage가 히스토리를 한 칸 되돌려 이 화면으로 돌아온다.
    void navigate('/login')
  }

  /** 상담을 요청하고 이 화면에서 대기 상태로 전환한다. (페이지 이동 없음) */
  const startVideoCall = async () => {
    const id = await requestConsultation()
    setConsultationId(id)
  }

  /** 대기를 취소하고 연결 버튼 상태로 되돌린다. */
  const cancelWaiting = async () => {
    const id = consultationId
    setConsultationId(null)
    if (id !== null) await cancelConsultation(id)
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

        {hasRequested && !isAuthPending && !isAuthenticated ? (
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

        {/*
          출발지·목적지를 모르면 상담을 요청할 수 없다(서버 필수 필드).
          경로 안내로 돌아가 다시 잡도록 안내한다 — 하단에 그 버튼이 이미 있다.
        */}
        {hasRequested && isAuthenticated && isRouteMissing ? (
          <BotBubble>{t('helpChat.routeRequired')}</BotBubble>
        ) : null}

        {hasRequested && isAuthenticated && !isRouteMissing ? (
          <>
            <BotBubble>{t('helpChat.ready')}</BotBubble>
            <div className="mt-1 flex flex-col items-center gap-3">
              {isWaiting ? (
                <>
                  {/* 연결 버튼 자리를 그대로 차지하는 대기 표시 — 레이아웃이 튀지 않는다 */}
                  <div
                    role="status"
                    aria-live="polite"
                    className="border-brand-soft bg-surface text-brand-dark flex h-[52px] w-[82%] items-center justify-center gap-2.5 rounded-2xl border-[1.6px] text-[14.5px] font-bold"
                  >
                    <span
                      aria-hidden
                      className="border-line border-t-brand size-5 animate-spin rounded-full border-[3px]"
                    />
                    {waiting.queuePosition !== null
                      ? t('consultation.queuePosition', {
                          position: waiting.queuePosition,
                        })
                      : t('consultation.connecting')}
                  </div>
                  <button
                    type="button"
                    onClick={() => void cancelWaiting()}
                    className="border-line bg-surface text-ink focus-visible:ring-brand h-11 w-[82%] rounded-2xl border text-[13px] transition active:brightness-95 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => void startVideoCall()}
                  className="bg-brand-gradient focus-visible:ring-brand h-[52px] w-[82%] rounded-2xl text-[15px] font-bold text-white shadow-sm transition active:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
                >
                  {t('helpChat.connect')}
                </button>
              )}
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
