const MINUTES_PER_HOUR = 60

/** i18n 의 `t` 만 받는 최소 형태. 훅 밖에서도 쓸 수 있게 의존을 좁힌다. */
type Translate = (key: string, options?: Record<string, unknown>) => string

/**
 * 분 단위 소요 시간을 표시 문자열로 만든다. ("24분" / "1시간 24분")
 *
 * 서버는 소요 시간을 숫자(분)로만 준다. 60분을 넘으면 끊어 읽어야 하고 그
 * 표기는 언어마다 다르므로 i18n 키로 만든다. 경로 선택 카드와 도착 요약이
 * 같은 규칙을 써야 해서 한 곳에 둔다.
 */
export function toDurationLabel(t: Translate, totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR

  return hours > 0
    ? t('route.select.durationHour', { h: hours, m: minutes })
    : t('route.select.durationMin', { m: minutes })
}
