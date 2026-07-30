import type { RequestHandler } from 'msw'

/**
 * 요청을 가로채는 규칙.
 *
 * 응답 값은 data.ts 에 모아두고 여기서는 규칙만 다룬다.
 * BE 연동이 끝난 엔드포인트는 이 배열에서 지우면 실제 서버로 넘어간다.
 * (browser.ts 의 onUnhandledRequest: 'bypass')
 *
 * 경로는 client.ts 의 baseURL 과 맞춰 절대 경로로 적는다.
 */
export const BASE = '*/api/v1'

/** 상태를 들고 있지 않으므로 새로고침하면 처음부터 다시 시작한다. */
export const handlers: RequestHandler[] = []
