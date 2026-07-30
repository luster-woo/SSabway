import { useEffect, useState } from 'react'

const TICK_MS = 1_000

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * 녹음 경과 시간 배지.
 *
 * 상담 수락 시점에 서버가 녹음을 시작하지만 응답에 시작 시각(startedAt)이 없어
 * 화면 진입 시각부터 클라이언트가 센다. 실제 통화 시간은 종료 응답의 durationSec 가
 * OpenVidu 웹훅 기준으로 확정하므로 이 값은 안내용이다.
 *
 * 녹화가 아니라 음성 녹음이다. (hasVideo:false, hasAudio:true)
 * TODO: 수락 응답에 startedAt 이 추가되면 그 값을 기준으로 바꾼다.
 */
export function RecordingBadge() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, TICK_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-[13px] font-bold text-white">
      <span aria-hidden className="bg-danger size-2 rounded-full" />
      REC {formatElapsed(elapsedSeconds)}
    </p>
  )
}
