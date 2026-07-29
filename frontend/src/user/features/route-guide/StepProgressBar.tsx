export interface StepProgressBarProps {
  /** 1부터 시작하는 현재 단계 */
  current: number
  total: number
  /** 스크린리더용 문구 ("2 / 5 단계 진행 중") */
  label: string
}

/** 단계 진행률 바. 마지막 단계에서 100%가 된다. */
export function StepProgressBar({
  current,
  total,
  label,
}: StepProgressBarProps) {
  // total이 0이면 0으로 나눠 NaN이 되므로 방어한다.
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total > 0 ? total : 1}
      aria-valuenow={current}
      aria-label={label}
      className="bg-line h-1.5 w-full overflow-hidden rounded-full"
    >
      <div
        className="bg-brand h-full rounded-full transition-[width] duration-300"
        style={{ width: `${String(percent)}%` }}
      />
    </div>
  )
}
