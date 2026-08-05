import { useEffect, useState } from 'react'

/** 로고를 유지하는 시간 */
const HOLD_MS = 2000
/** 사라질 때 페이드 시간. LandingSplash 의 transition duration 과 맞춘다. */
const FADE_MS = 560

const STORAGE_KEY = 'landing_splash_shown'

export type LandingPhase = 'shown' | 'leaving' | 'hidden'

/**
 * sessionStorage 접근은 던질 수 있다. (iOS 사파리 프라이빗 모드 등)
 * 저장소를 못 쓰는 것이 앱이 뜨지 않을 이유는 아니므로 조용히 삼킨다.
 * 못 읽으면 "아직 안 보여줬다"로 보고 진행한다 — 이 경우 부팅마다 한 번 뜬다.
 */
function alreadyShown(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markShown(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 저장 실패는 랜딩이 한 번 더 뜨는 것 외에 영향이 없다.
  }
}

/*
  "이번 부팅이 이 탭에서의 첫 접속인가" 를 모듈 평가 시점에 한 번만 판정한다.

  왜 컴포넌트 안이 아니라 여기인가 — 판정 시점이 "앱 부팅" 이어야 한다.
  이 모듈은 StartPage → UserApp 을 통해 메인 청크에 정적으로 포함되므로,
  어느 경로로 들어와도(/scan 새로고침 포함) 부팅 때 한 번 평가된다.
  StartPage 마운트 시점에 판정하면, /guide 에서 새로고침한 뒤 「처음으로」 로
  돌아올 때 그것이 "첫 접속" 으로 잡혀 랜딩이 뒤늦게 뜬다.

  sessionStorage 라서:
    - 새로고침    → 값이 남아 있다 → 안 뜬다
    - 탭 닫고 재접속 → 값이 사라진다 → 다시 뜬다
    - PWA 재실행  → 새 세션 → 다시 뜬다
*/
const isFirstEntry = !alreadyShown()
markShown()

/**
 * 이 페이지 생명주기 안에서 랜딩을 이미 보여줬는지.
 *
 * 서비스 안에서 「처음으로」 등으로 시작 페이지에 다시 들어올 때 랜딩이
 * 반복되지 않도록 막는다. (접속 → 랜딩 → 시작 페이지 … 재진입은 시작 페이지로)
 */
let displayed = false

/**
 * 첫 접속에서만 랜딩(스플래시)을 2초 보여주고 페이드아웃시킨다.
 *
 * 반환값을 그대로 렌더 조건으로 쓴다.
 *   - 'shown'   불투명하게 화면을 덮는다
 *   - 'leaving' 페이드아웃 중. 이때부터 탭이 아래 화면으로 통과한다
 *   - 'hidden'  렌더하지 않는다
 */
export function useLandingSplash(): LandingPhase {
  const [phase, setPhase] = useState<LandingPhase>(() =>
    isFirstEntry && !displayed ? 'shown' : 'hidden',
  )

  useEffect(() => {
    if (phase === 'hidden') return

    // StrictMode 의 이중 마운트에서도 결과는 같다. (phase 는 'shown' 을 유지)
    if (phase === 'shown') displayed = true

    const id = setTimeout(
      () => setPhase(phase === 'shown' ? 'leaving' : 'hidden'),
      phase === 'shown' ? HOLD_MS : FADE_MS,
    )

    return () => clearTimeout(id)
  }, [phase])

  return phase
}
