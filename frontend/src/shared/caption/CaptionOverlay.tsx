import { cn } from '@/shared/lib/cn'

interface CaptionOverlayProps {
  lines: string[]
  partial: string | null
  /** 위치 지정 (기본 'bottom-4'). bottom-* 을 포함해 통째로 교체된다 */
  className?: string
}

/**
 * 비디오 위에 얹는 자막. 부모가 relative 인 컨테이너 하단 중앙에 뜬다.
 *
 *   <div className="relative">
 *     <OpenViduVideo streamManager={remoteStream} ... />
 *     <CaptionOverlay lines={lines} partial={partial} />
 *   </div>
 *
 * 보여줄 내용이 없으면 DOM 을 만들지 않고, 있어도 pointer-events 를 꺼서
 * 비디오 터치(음소거·종료 버튼 등)를 가리지 않는다.
 */
export function CaptionOverlay({
  lines,
  partial,
  className,
}: CaptionOverlayProps) {
  if (lines.length === 0 && partial === null) return null

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 flex justify-center px-4',
        // 위치는 화면마다 다르다(컨트롤 버튼·라벨을 피해야 함). cn 이 단순
        // join 이라 bottom-* 충돌을 병합하지 못하므로 기본값 교체로 받는다.
        className ?? 'bottom-4',
      )}
    >
      <div className="max-w-full rounded-lg bg-black/60 px-3 py-1.5 text-center text-sm leading-snug text-white">
        {lines.map((line, index) => (
          <p key={`${String(index)}-${line}`}>{line}</p>
        ))}
        {partial !== null && <p className="text-white/70">{partial}</p>}
      </div>
    </div>
  )
}
