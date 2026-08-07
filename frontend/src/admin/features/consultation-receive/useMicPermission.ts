import { useEffect, useState } from 'react'

/** 브라우저에 저장된 마이크 권한 상태. */
export const MIC_PERMISSION = {
  /** 아직 조회 전이거나 브라우저가 조회를 지원하지 않는다 */
  UNKNOWN: 'UNKNOWN',
  GRANTED: 'GRANTED',
  /** 아직 물어본 적이 없다 — 수락할 때 권한 팝업이 뜬다 */
  PROMPT: 'PROMPT',
  /** 차단되어 있다. 수락해도 팝업 없이 즉시 실패한다 */
  DENIED: 'DENIED',
} as const

export type MicPermission = (typeof MIC_PERMISSION)[keyof typeof MIC_PERMISSION]

function toMicPermission(state: PermissionState): MicPermission {
  if (state === 'granted') return MIC_PERMISSION.GRANTED
  if (state === 'denied') return MIC_PERMISSION.DENIED
  return MIC_PERMISSION.PROMPT
}

/**
 * 마이크 권한 상태를 **장치를 열지 않고** 확인한다.
 *
 * `getUserMedia` 와 달리 권한 팝업이 뜨지 않고 마이크도 켜지지 않는다.
 * 그래서 대기 목록 화면에 머무는 내내 켜 둘 수 있다.
 *
 * 왜 필요한가 — 역무원이 브라우저에서 마이크를 한 번 "차단" 하면 그 설정이
 * origin 에 저장되어 이후로는 팝업조차 뜨지 않는다. 그 상태로 [수락] 을 누르면
 * 발행이 실패하는데, 그때 상담을 취소해 버리면 그 역으로 들어오는 상담이
 * 줄줄이 취소된다(CANCELED 는 재요청을 막지 않으므로 사용자가 다시 요청해도
 * 똑같이 취소된다). 역무원 본인의 설정 문제로 남의 요청을 없애는 셈이다.
 *
 * 그래서 수락을 시도하기 전에 미리 알려 준다 — 사용자가 기다리기 시작하기
 * 전에 역무원이 고칠 수 있도록.
 *
 * `change` 이벤트를 듣기 때문에 역무원이 주소창에서 권한을 허용하는 순간
 * 새로고침 없이 풀린다.
 *
 * 지원하지 않는 브라우저(파이어폭스 등)에서는 UNKNOWN 으로 남는다 — 그 경우
 * 수락 시점의 getUserMedia 검사가 그대로 안전망이 된다.
 */
export function useMicPermission(): MicPermission {
  const [permission, setPermission] = useState<MicPermission>(
    MIC_PERMISSION.UNKNOWN,
  )

  useEffect(() => {
    if (!navigator.permissions?.query) return

    let isCurrent = true
    let status: PermissionStatus | null = null

    const sync = () => {
      if (isCurrent && status) setPermission(toMicPermission(status.state))
    }

    navigator.permissions
      // lib.dom 의 PermissionName 에 'microphone' 이 없어 캐스팅한다
      .query({ name: 'microphone' as PermissionName })
      .then((result) => {
        if (!isCurrent) return
        status = result
        sync()
        result.addEventListener('change', sync)
      })
      .catch(() => {
        // 미지원 브라우저는 TypeError 를 던진다. UNKNOWN 으로 남긴다.
      })

    return () => {
      isCurrent = false
      status?.removeEventListener('change', sync)
    }
  }, [])

  return permission
}
