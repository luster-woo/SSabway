import { useEffect, useRef } from 'react'

/**
 * 컴포넌트가 **실제로** 언마운트될 때 콜백을 1회 실행한다.
 *
 * 쓰임새 — 화면을 떠날 때 서버에 정리 신호를 보내야 하는 경우.
 *   - 통화 화면 이탈 → leaveConsultation (활성 상담이 남으면 다음 요청이 409)
 *   - 대기 중 이탈 → cancelConsultation
 *
 * 왜 그냥 `useEffect(() => cleanup, [])` 가 아닌가 — 두 가지를 피해야 한다.
 *
 * 1) StrictMode(개발) 이중 마운트.
 *    개발에서 React 는 mount→unmount→mount 로 이펙트를 두 번 돌린다. 순진하게
 *    cleanup 에서 정리 API 를 부르면, 방금 들어온 통화를 첫 번째 가짜 언마운트가
 *    끊어 버린다. 그래서 cleanup 은 실행을 **다음 tick 으로 미루고**, 곧바로
 *    이어지는 재마운트가 그 예약을 취소한다. 진짜 언마운트에서는 재마운트가
 *    없어 예약이 살아남아 실행된다. (setup→cleanup→setup 은 같은 tick 에
 *    동기로 돌고, setTimeout 콜백은 그 뒤 매크로태스크라 순서가 보장된다)
 *
 * 2) 새로고침·탭 닫기.
 *    이때는 React cleanup 이 아예 돌지 않는다(페이지가 통째로 언로드된다).
 *    그래서 이 훅은 **앱 내 이동·하드웨어 back** 만 잡는다 — 새로고침은
 *    건드리지 않으므로, URL 로 재접속하는 화면(통화·관리자 상담방)의
 *    새로고침 복구를 깨지 않는다. 탭 닫기·강제 종료의 정리는 서버의
 *    유예 시간(타임아웃) 이 맡아야 한다.
 *
 * 콜백은 매 렌더 최신 것으로 갱신돼, 언마운트 시점의 최신 상태를 읽는다.
 */
export function useRunOnRealUnmount(callback: () => void): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    // 재마운트(StrictMode)면 직전 cleanup 이 예약한 실행을 취소한다.
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    return () => {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        callbackRef.current()
      }, 0)
    }
  }, [])
}
