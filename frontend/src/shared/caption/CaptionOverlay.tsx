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
      {/*
        크기는 통화 중 흘깃 보고 읽히는 것이 기준이다. 본문 텍스트(14px)보다
        크게 잡았다 — 사용자는 카메라를 들고 움직이는 중이고, 역무원은 화면에서
        떨어져 앉는다. 큰 화면에서는 한 단 더 키운다.

        배경을 진하게(black/75) 두는 이유는 영상 위에 얹히기 때문이다.
        밝은 표지판이나 조명이 뒤에 오면 옅은 배경으로는 글자가 묻힌다.
      */}
      <div className="max-w-full rounded-xl bg-black/75 px-4 py-2.5 text-center text-lg leading-relaxed font-medium text-white sm:text-xl">
        {lines.map((line, index) => (
          <p key={`${String(index)}-${line}`}>{line}</p>
        ))}
        {/* 말하는 중(INTERIM)은 아직 바뀔 수 있어 흐리게 — 확정과 구분된다 */}
        {partial !== null && <p className="text-white/70">{partial}</p>}
      </div>
    </div>
  )
}
