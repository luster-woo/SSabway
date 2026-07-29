import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const TICK_MS = 1_000

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(minutes)}:${pad(seconds)}`
}

export interface ConnectedBadgeProps {
  /** 연결된 뒤에만 시간을 센다. */
  isConnected: boolean
}

/**
 * 역무원 연결 상태 배지.
 *
 * 서버가 통화 시작 시각을 내려주지 않아 연결된 시점부터 클라이언트가 센다.
 * 실제 통화 시간은 종료 시 서버가 durationSec 으로 확정한다.
 */
export function ConnectedBadge({ isConnected }: ConnectedBadgeProps) {
  const { t } = useTranslation()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!isConnected) return

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, TICK_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [isConnected])

  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-[13px] font-bold text-white">
      <span aria-hidden className="bg-danger size-2 rounded-full" />
      {t('consultation.video.staffConnected')} · {formatElapsed(elapsedSeconds)}
    </p>
  )
}
