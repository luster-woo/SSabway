import { isAxiosError } from 'axios'

import { IS_DEV } from '@/shared/lib/env'
import type { ApiErrorBody } from '@/shared/types/api'
import { NAV_ERROR_CODE, type NavRouteRequest } from '@/shared/types/navigation'

/** 실패 상황에서 사용자가 취할 수 있는 행동 */
export const NAV_RECOVERY = {
  /** 표지판을 다시 찍어 출발 지점을 잡는다 */
  RESCAN: 'RESCAN',
  /** 엘리베이터 조건을 빼고 다시 찾는다 */
  WITHOUT_ELEVATOR: 'WITHOUT_ELEVATOR',
  /** 같은 조건으로 재시도 (일시적 장애) */
  RETRY: 'RETRY',
  /** 질문에 다시 답한다 (지금 조건으로는 갈 수 없다) */
  CHANGE_ANSWERS: 'CHANGE_ANSWERS',
} as const

export type NavRecovery = (typeof NAV_RECOVERY)[keyof typeof NAV_RECOVERY]

export interface NavFailure {
  /** 화면에 보여줄 문구의 i18n 키 */
  messageKey: string
  recovery: NavRecovery
  /** 문구에 끼워 넣을 값 (HTTP 상태 등). 없으면 생략 */
  params?: Record<string, string | number>
}

/**
 * 실패 응답을 "무슨 일이고 무엇을 할 수 있는지"로 옮긴다.
 *
 * 상태코드만으로는 갈리지 않는다 — NAV_ROUTE_NOT_FOUND 와
 * NAV_NO_STEP_FREE_ROUTE 는 둘 다 404 지만 후자는 "엘리베이터를 포기하면 갈 수
 * 있다"는 뜻이라 사용자가 할 수 있는 일이 남아 있다. 서버가 그 구분을 위해
 * 일부러 코드를 나눠 뒀으므로(NavigationService.findPlan 주석) 코드로 읽는다.
 */
export function toNavFailure(
  error: unknown,
  request: NavRouteRequest | null = null,
): NavFailure {
  if (!isAxiosError(error)) {
    return {
      messageKey: 'routeGuide.failed',
      recovery: NAV_RECOVERY.RETRY,
    }
  }

  // 응답 자체가 없으면 서버에 닿지 못한 것이다(미기동·프록시 대상 오류).
  if (!error.response) {
    return {
      messageKey: 'routeGuide.failedNetwork',
      recovery: NAV_RECOVERY.RETRY,
    }
  }

  const status = error.response.status
  const code = (error.response.data as ApiErrorBody | undefined)?.code

  /*
    이 API 가 낼 수 있는 실패는 아래 NAV_* 다섯뿐이다. 그 밖의 응답은 요청이
    NavigationController 까지 닿지 못했다는 뜻이라 원인이 서버 쪽에 있다.

      401 UNAUTHORIZED  SecurityConfig 는 /api/v1/routes/** 를 permitAll 로
                        열어 두었다. 그런데도 401 이면 그 설정이 없던 시절의
                        옛 빌드가 떠 있는 것이다. (실제로 이 증상을 겪었다)
      404               라우팅이 컨트롤러를 못 찾음
      500 (본문 없음)   dev 프록시가 대상 포트에 연결 실패(ECONNREFUSED)
      502 · 504         게이트웨이가 끊음

    이걸 전부 "잠시 후 다시 시도"로 뭉개면 사용자도 개발자도 어디를 볼지 알 수
    없다. 상태 코드를 드러내야 좁혀진다.
  */
  const unexpected = (): NavFailure => {
    if (IS_DEV) {
      console.error('[navi] 예상과 다른 실패 응답', {
        status,
        code,
        url: error.config?.url,
        data: error.response?.data,
      })
    }
    return {
      messageKey: 'routeGuide.failedUnexpected',
      recovery: NAV_RECOVERY.RETRY,
      params: { status },
    }
  }

  switch (code) {
    case NAV_ERROR_CODE.NAV_NO_STEP_FREE_ROUTE:
      // 계단으로는 갈 수 있다. 엘리베이터 조건만 빼면 경로가 나온다.
      return {
        messageKey: 'routeGuide.failedNoStepFree',
        recovery: NAV_RECOVERY.WITHOUT_ELEVATOR,
      }

    case NAV_ERROR_CODE.NAV_ROUTE_NOT_FOUND:
      /*
        서버는 두 가지 실패를 이 코드 하나로 뭉쳐서 준다.
          ⓐ 출발지에서 개찰구까지 길이 없다
          ⓑ 들러야 할 시설(ATM·편의점·발매기)에 갈 수 없다
        RoutePlanner 가 어느 쪽이든 Optional.empty() 를 돌려주기 때문이다.

        구분이 필요한 이유는 사용자가 할 일이 정반대라서다. ⓐ는 위치를 다시
        잡아야 하지만, ⓑ는 표지판을 몇 번 다시 찍어도 소용없다 — 이 역에 그
        시설이 없거나 닿을 수 없는 것이라 "다른 방법"을 골라야 한다.

        요청을 보면 갈라진다. needs 를 실었다면 경유지가 있는 요청이므로 ⓑ일
        수 있고, 바로 개찰구로 가는 요청(readyToGo)이라면 ⓐ가 확실하다.
        ⓑ 쪽은 확정이 아니라 가능성이지만, 그때 제시하는 "답변 다시 하기"가
        표지판 재촬영보다 실제로 도움이 된다.

        ✅ BE 가 NAV_FACILITY_UNREACHABLE 을 따로 내주면 이 추론을 지우고
           코드로 갈면 된다. (명세의 "구분할지 결정 필요" 항목)
      */
      if (request?.needs) {
        return {
          messageKey: 'routeGuide.failedFacility',
          recovery: NAV_RECOVERY.CHANGE_ANSWERS,
        }
      }
      return {
        messageKey: 'routeGuide.failedNoRoute',
        recovery: NAV_RECOVERY.RESCAN,
      }

    case NAV_ERROR_CODE.NAV_NODE_NOT_FOUND:
      // 출발 지점이 역 도면에 없는 id다. 다시 인식하는 것 말고는 방법이 없다.
      return {
        messageKey: 'routeGuide.failedUnknownPoint',
        recovery: NAV_RECOVERY.RESCAN,
      }

    case NAV_ERROR_CODE.NAV_NEEDS_REQUIRED:
      // 질문에 덜 답한 상태로 요청이 나갔다는 뜻이다. 답을 다시 받아야 한다.
      return {
        messageKey: 'routeGuide.failedNeedAnswers',
        recovery: NAV_RECOVERY.RESCAN,
      }

    case NAV_ERROR_CODE.NAV_GRAPH_NOT_LOADED:
      // 서버가 아직 그래프를 못 읽었다. 사용자 잘못이 아니고 곧 복구된다.
      return {
        messageKey: 'routeGuide.failedNotReady',
        recovery: NAV_RECOVERY.RETRY,
      }

    default:
      return unexpected()
  }
}
