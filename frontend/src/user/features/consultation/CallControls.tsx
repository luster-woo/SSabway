import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

interface ControlButtonProps {
  label: string
  /** 꺼진 상태면 아이콘에 사선을 겹쳐 표시한다. */
  isOff?: boolean
  isDanger?: boolean
  icon: ReactNode
  onClick: () => void
}

/** 아이콘 + 아래 라벨 한 쌍 */
function ControlButton({
  label,
  isOff = false,
  isDanger = false,
  icon,
  onClick,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isOff ? true : undefined}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          'relative flex size-[clamp(52px,15vw,60px)] items-center justify-center rounded-full',
          'transition active:brightness-90',
          isDanger ? 'bg-danger' : isOff ? 'bg-white/25' : 'bg-white/15',
        )}
      >
        {icon}
        {isOff ? (
          <span
            aria-hidden
            className="absolute h-[2px] w-[58%] rotate-45 rounded-full bg-white"
          />
        ) : null}
      </span>
      <span className="text-[12px] font-bold text-white/85">{label}</span>
    </button>
  )
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="6.5" width="13" height="11" rx="2.5" />
      <path d="M15.5 11l6-3.5v9L15.5 13z" />
    </svg>
  )
}

function EndIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export interface CallControlsProps {
  isMicOn: boolean
  isCameraOn: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onEnd: () => void
}

/** 화면 하단 통화 조작 버튼 3개 */
export function CallControls({
  isMicOn,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
  onEnd,
}: CallControlsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-start gap-[clamp(20px,7vw,32px)] text-white">
      <ControlButton
        label={t('consultation.video.mic')}
        isOff={!isMicOn}
        icon={<MicIcon />}
        onClick={onToggleMic}
      />
      <ControlButton
        label={t('consultation.video.camera')}
        isOff={!isCameraOn}
        icon={<CameraIcon />}
        onClick={onToggleCamera}
      />
      <ControlButton
        label={t('consultation.video.endShort')}
        isDanger
        icon={<EndIcon />}
        onClick={onEnd}
      />
    </div>
  )
}
