export interface LoadingOverlayProps {
  message: string
}

/** 화면 전체를 덮는 로딩 오버레이. AI 분석·상담 연결 등 대기 상태 공용. */
export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div
      role="status"
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0a0d11]/85"
    >
      <span
        aria-hidden
        className="size-11 animate-spin rounded-full border-4 border-white/15 border-t-[#018abe]"
      />
      <p className="px-8 text-center text-[13.5px] leading-5 text-[#c7d0da]">
        {message}
      </p>
    </div>
  )
}
