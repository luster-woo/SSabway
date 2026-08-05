import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import {
  getInstallPromptSnapshot,
  isAppInstalled,
  showInstallPrompt,
  subscribeInstallPrompt,
  type InstallOutcome,
} from '@/shared/pwa/installPromptEvent'
import { isIos, isRunningStandalone } from '@/shared/pwa/platform'

/** 랜딩이 걷힌 뒤 시트가 올라오기까지의 간격 */
const ENTER_DELAY_MS = 400
/** 퇴장 시간. InstallPromptSheet 의 나가는 transition 과 같아야 한다. */
const LEAVE_MS = 240
/**
 * `beforeinstallprompt` 를 기다려 주는 한계.
 *
 * 이 이벤트는 부팅 후 수백 ms 안에 오는 게 보통이지만 늦게 올 수도 있다.
 * 한참 뒤에 시트가 튀어 올라오면 이미 화면을 만지고 있던 사용자가 오탭한다.
 * 넘기면 이번 접속에서는 포기한다 — 다음 접속에 다시 기회가 있다.
 */
const WAIT_LIMIT_MS = 3000

const STORAGE_KEY = 'install_prompt_shown'

export type InstallPromptPhase = 'hidden' | 'open' | 'leaving'
/**
 * 'prompt' 브라우저 설치 다이얼로그를 띄울 수 있다. (Chromium 계열)
 * 'manual' 설치 API 가 없어 「공유 → 홈 화면에 추가」를 안내한다. (iOS)
 */
export type InstallPromptVariant = 'prompt' | 'manual'

/*
  sessionStorage 접근은 던질 수 있다. (iOS 프라이빗 모드 등)
  못 읽으면 "아직 안 보여줬다" 로 보고 진행한다 — 랜딩 스플래시와 같은 규칙이다.
*/
function shownInThisSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markShownInThisSession(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 저장 실패는 시트가 한 번 더 뜨는 것 외에 영향이 없다.
  }
}

/**
 * 이 페이지 생명주기 안에서 이미 띄웠는지.
 *
 * 서비스 안에서 「처음으로」 로 시작 페이지에 다시 들어올 때 시트가 반복되지
 * 않게 막는다. sessionStorage 만으로는 부족한데, 저장소를 못 쓰는 환경에서도
 * 재진입 반복은 막아야 하기 때문이다.
 */
let displayed = false

export interface InstallPromptControls {
  phase: InstallPromptPhase
  variant: InstallPromptVariant
  /**
   * 설치를 시도한다. **클릭 핸들러에서 바로 호출할 것** — 앞에 await 가 끼면
   * 사용자 제스처가 끊겨 브라우저가 프롬프트를 무시한다.
   * 반환값으로 사용자에게 보여줄 안내를 고른다.
   */
  accept: () => Promise<InstallOutcome | 'manual'>
  dismiss: () => void
}

/**
 * 설치 유도 바텀시트의 표시 여부·시점을 정한다.
 *
 * 정책 (사용자 확인)
 *   - 표시 시점: 랜딩 스플래시가 완전히 걷힌 직후 (+400ms)
 *   - 주기: **접속마다 1회.** 새로고침이나 서비스 내 재진입에는 다시 뜨지 않고,
 *     탭을 닫았다 재접속하면 다시 뜬다. (랜딩 스플래시와 같은 판정)
 *   - 이미 설치된 상태(standalone)면 띄우지 않는다
 *
 * @param isReady 랜딩이 걷혀서 시트를 띄워도 되는 상태인지
 */
export function useInstallPrompt(isReady: boolean): InstallPromptControls {
  const promptEvent = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPromptSnapshot,
  )

  const [phase, setPhase] = useState<InstallPromptPhase>('hidden')
  const [variant, setVariant] = useState<InstallPromptVariant>('prompt')

  /** isReady 가 처음 켜진 시각. 이벤트를 얼마나 기다렸는지 재는 기준이다. */
  const readyAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (isReady && readyAtRef.current === null) readyAtRef.current = Date.now()
  }, [isReady])

  useEffect(() => {
    if (!isReady || phase !== 'hidden' || displayed) return
    if (isRunningStandalone() || isAppInstalled()) return
    if (shownInThisSession()) return

    const needsManualSteps = isIos()

    /*
      Chromium 계열은 이벤트가 잡히기 전에는 띄우지 않는다.
      누르면 아무 일도 안 나는 Install 버튼을 보여주는 것보다 낫다.
    */
    if (!needsManualSteps) {
      if (promptEvent === null) return

      const readyAt = readyAtRef.current
      if (readyAt !== null && Date.now() - readyAt > WAIT_LIMIT_MS) return
    }

    const id = setTimeout(() => {
      displayed = true
      markShownInThisSession()
      setVariant(needsManualSteps ? 'manual' : 'prompt')
      setPhase('open')
    }, ENTER_DELAY_MS)

    return () => clearTimeout(id)
  }, [isReady, phase, promptEvent])

  const dismiss = useCallback(() => {
    setPhase((current) => (current === 'open' ? 'leaving' : current))
  }, [])

  // 퇴장 트랜지션이 끝난 뒤에 언마운트한다 — 먼저 지우면 뚝 끊긴다.
  useEffect(() => {
    if (phase !== 'leaving') return

    const id = setTimeout(() => setPhase('hidden'), LEAVE_MS)
    return () => clearTimeout(id)
  }, [phase])

  const accept = useCallback(async (): Promise<InstallOutcome | 'manual'> => {
    if (variant === 'manual') {
      dismiss()
      return 'manual'
    }

    // 제스처를 잃지 않도록 닫기보다 프롬프트를 먼저 부른다.
    const outcome = await showInstallPrompt()
    dismiss()
    return outcome
  }, [variant, dismiss])

  return { phase, variant, accept, dismiss }
}
