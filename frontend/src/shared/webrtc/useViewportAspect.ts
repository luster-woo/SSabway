import { useEffect, useState, type RefObject } from 'react'
import type { Session, SignalEvent } from 'openvidu-browser'

/**
 * 사용자 화면 비율(가로 ÷ 세로)을 역무원 쪽으로 실어 나른다.
 *
 * ## 왜 필요한가
 *
 * 사용자 화면(CameraStage)과 역무원 화면(VideoStage)은 **같은 발행 프레임**을
 * 받아 각자의 박스에 `object-cover` 로 담는다. 그래서 잘려 나가는 범위는 오직
 * **박스의 가로:세로 비율** 하나로 정해지고, 두 박스의 비율이 같아야만 역무원이
 * 사용자와 똑같은 화각을 본다 ("지금 화면 오른쪽에 보이는 표지판").
 *
 * 그 비율을 상수로 박아 둘 수는 없다.
 *   - 기기마다 화면 비율이 다르다 (0.46 ~ 0.56 대까지 흔하다)
 *   - 모바일 주소창이 나타났다 사라질 때마다 `100dvh` 가 실시간으로 바뀐다
 *   - 가로로 눕히면 비율이 뒤집힌다
 * 그래서 사용자 브라우저가 자기 박스를 재서 실제 값을 보내 준다.
 *
 * ## 주고받는 방법
 *
 * OpenVidu 시그널을 쓴다. 시그널은 **그 순간 접속해 있는 참가자에게만** 가므로,
 * 누가 먼저 들어왔든 값이 도달하도록 양쪽에서 한 번씩 민다.
 *
 *   - 사용자가 나중에 들어온 경우 → 사용자가 접속 직후 한 번 보낸다
 *   - 역무원이 나중에 들어온 경우(수락 직후·새로고침) → 역무원이 요청을 보내고
 *     사용자가 그 요청에 답한다
 *
 * 역무원은 **리스너를 붙인 뒤에** 요청을 보내므로 응답을 놓치는 경합이 없다.
 *
 * ⚠️ 이 값은 화각을 맞추는 표시용이다. 못 받아도 통화는 그대로 되고, 역무원
 *    화면만 기존 기본 비율로 떨어진다 (VideoStage 의 폴백).
 */

/*
  시그널 이름.

  보낼 때는 이름 그대로 쓰고, 받을 때는 OpenVidu 규칙대로 `signal:` 을 붙인
  이벤트를 구독한다. 둘을 헷갈리면 조용히 아무 일도 일어나지 않으므로
  (구독은 성공하고 이벤트만 영영 안 온다) 여기서 한 번에 만들어 둔다.
*/
/** 사용자 → 역무원. 본문은 비율 하나뿐이라 JSON 없이 숫자 문자열로 보낸다. */
const ASPECT_SIGNAL = 'viewport-aspect'
/** 역무원 → 사용자. 본문 없음. "지금 값을 다시 보내 달라" 는 뜻만 있다. */
const ASPECT_REQUEST_SIGNAL = 'viewport-aspect-request'
const ASPECT_EVENT = `signal:${ASPECT_SIGNAL}` as const
const ASPECT_REQUEST_EVENT = `signal:${ASPECT_REQUEST_SIGNAL}` as const

/**
 * 받아들일 비율의 범위.
 *
 * 사람이 들고 보는 화면이라면 세로로 아주 긴 폰(≈0.4)부터 가로로 눕힌
 * 태블릿(≈1.8)까지다. 이 밖의 값은 계산 사고이거나 남의 시그널이므로 버린다 —
 * 그대로 쓰면 역무원 화면의 영상 틀이 터무니없는 모양으로 찌그러진다.
 */
const MIN_ASPECT = 0.2
const MAX_ASPECT = 5

/** 소수 셋째 자리까지만 본다. 주소창 애니메이션 중의 미세한 떨림을 흘려보낸다. */
const ASPECT_PRECISION = 3

/**
 * 사용자 쪽 — 크롭 기준 박스를 재서 계속 알린다.
 *
 * @param session 접속이 끝난 OpenVidu 세션. null 이면 아무것도 하지 않는다.
 * @param boxRef  `object-cover` 가 걸린 그 박스. 화면 전체가 아니라 **실제로
 *                영상을 자르는 엘리먼트**를 넘겨야 한다 — 레이아웃이 바뀌어도
 *                측정값이 따라오도록 CameraStage 안쪽 박스를 잡는다.
 */
export function usePublishViewportAspect(
  session: Session | null,
  boxRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const box = boxRef.current
    if (!session || !box) return

    /*
      마지막으로 보낸 값. 리사이즈로 불렸는데 값이 그대로면 보내지 않는다 —
      ResizeObserver 는 주소창이 움직이는 동안 초당 수십 번 깨어난다.
      역무원의 요청에는 값이 같아도 반드시 답해야 하므로(그쪽은 아직 아무
      값도 없다) force 로 이 검사를 건너뛴다.
    */
    let lastSent = ''

    const send = (force: boolean) => {
      const { width, height } = box.getBoundingClientRect()
      // 아직 레이아웃 전이거나 화면이 접힌 상태. 0 으로 나누지 않는다.
      if (width <= 0 || height <= 0) return

      const aspect = (width / height).toFixed(ASPECT_PRECISION)
      if (!force && aspect === lastSent) return
      lastSent = aspect

      session.signal({ type: ASPECT_SIGNAL, data: aspect }).catch(() => {
        // 끊기는 중이면 실패한다. 재전송할 이유가 없다 — 다음 접속에서
        // 역무원이 다시 요청하고, 그때는 세션도 새것이다.
      })
    }

    const observer = new ResizeObserver(() => {
      send(false)
    })
    observer.observe(box)

    const answerRequest = () => {
      send(true)
    }
    session.on(ASPECT_REQUEST_EVENT, answerRequest)

    // 이미 들어와 있는 역무원을 위한 첫 통보.
    send(true)

    return () => {
      observer.disconnect()
      session.off(ASPECT_REQUEST_EVENT, answerRequest)
    }
  }, [session, boxRef])
}

/**
 * 역무원 쪽 — 사용자 화면 비율을 받는다. 아직 못 받았으면 null.
 *
 * 세션이 바뀌면(다른 상담·재접속) null 로 되돌린다. 이전 사용자의 비율을
 * 다음 사용자 영상에 그대로 쓰면 조용히 틀린 화각을 보게 된다.
 */
export function useRemoteViewportAspect(
  session: Session | null,
): number | null {
  const [aspect, setAspect] = useState<number | null>(null)

  useEffect(() => {
    setAspect(null)
    if (!session) return

    const receive = (event: SignalEvent) => {
      const value = Number(event.data)
      if (!Number.isFinite(value)) return
      if (value < MIN_ASPECT || value > MAX_ASPECT) return
      setAspect(value)
    }

    /*
      순서가 중요하다 — 리스너를 먼저 붙이고 요청한다. 반대면 사용자가
      즉시 답했을 때 그 응답을 받을 곳이 없다.
    */
    session.on(ASPECT_EVENT, receive)
    session.signal({ type: ASPECT_REQUEST_SIGNAL }).catch(() => {
      // 요청이 실패해도 사용자가 접속할 때 스스로 보내 준다.
    })

    return () => {
      session.off(ASPECT_EVENT, receive)
    }
  }, [session])

  return aspect
}
