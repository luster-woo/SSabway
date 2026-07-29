/**
 * 초를 m:ss 로 바꾼다. (300 → "5:00")
 *
 * 남은 시간 표시에만 쓰므로 시간 단위는 다루지 않는다.
 * 인증 제한 시간이 한 시간을 넘을 일은 없다.
 */
export function formatDuration(totalSec: number): string {
  const safeSec = Math.max(0, Math.floor(totalSec))
  const minutes = Math.floor(safeSec / 60)
  const seconds = safeSec % 60

  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}
