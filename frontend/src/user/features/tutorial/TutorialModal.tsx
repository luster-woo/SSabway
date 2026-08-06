import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'
import { useLanguage } from '@/shared/lib/useLanguage'
import { Button } from '@/shared/ui'
import {
  TUTORIAL_MEDIA_PADDING_BOTTOM,
  TUTORIAL_STEPS,
  toTutorialGifUrl,
} from '@/user/features/tutorial/tutorialSteps'

export interface TutorialModalProps {
  onClose: () => void
}

/** 페이지를 넘길 최소 드래그 거리(px). 이보다 짧으면 제자리로 돌아온다. */
const SWIPE_THRESHOLD = 48

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/**
 * 사용법 안내 모달 — GIF 3장을 옆으로 넘겨 본다.
 *
 * 1) 표지판을 어떻게 찍는다 → 2) 표지판을 이어가며 안내받는다 → 3) 막히면
 * 역무원과 화상 상담한다. 실제 사용 흐름과 같은 순서다(tutorialSteps 참고).
 *
 * **GIF 안에 문구가 이미 그려져 있다.** 그래서 언어별로 파일이 다르고(선택한
 * 언어의 폴더에서 가져온다), 화면에서는 설명을 덧붙이지 않는다 — 같은 말을 두
 * 번 하게 되고, 번역이 어긋나면 그림과 글이 다른 말을 한다.
 *
 * **팝업 크기는 세 페이지가 같다.** GIF 영역 높이를 한 값으로 고정해(비율 선택
 * 근거는 TUTORIAL_MEDIA_PADDING_BOTTOM 주석) 넘길 때 팝업이 늘었다 줄었다
 * 하지 않는다. 남는 자리는 가운데 정렬로 양쪽에 똑같이 나뉘고, GIF 배경과 박스가
 * 모두 흰색이라 눈에 띄지 않는다.
 *
 * 넘기는 방법을 셋 다 둔다: 스와이프(폰) · 화살표 버튼 · ←→ 키(데스크톱).
 * 폰에서 스와이프만 두면 화살표가 없어 넘길 수 있다는 걸 모르는 사용자가 있다.
 *
 * GIF 는 한 장에 150~650KB 라 3장을 한꺼번에 받지 않는다. 다음 한 장까지만
 * 미리 받으므로, 1페이지만 보고 닫는 사용자는 두 장만 내려받는다.
 * (지하 약전파 구간을 고려한 선택 — loadedUpTo 주석 참고)
 */
export function TutorialModal({ onClose }: TutorialModalProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const titleId = useId()

  const [page, setPage] = useState(0)
  const lastIndex = TUTORIAL_STEPS.length - 1

  /*
    여기까지의 페이지만 `src` 를 채운다 — 처음에는 0·1 두 장.

    한 번 받은 장은 다시 내리지 않는다(값이 줄지 않는다). "보고 있는 페이지
    ±1" 로만 판단하면 3페이지까지 갔다가 1페이지로 돌아올 때 3페이지가
    언마운트돼, 다시 넘길 때 요청이 한 번 더 나간다(실제로 그랬다).
  */
  const [loadedUpTo, setLoadedUpTo] = useState(1)
  useEffect(() => {
    setLoadedUpTo((loaded) => Math.max(loaded, page + 1))
  }, [page])

  /** 드래그 중 손가락을 따라 움직인 거리(px). 놓으면 0 으로 돌아간다. */
  const [dragX, setDragX] = useState(0)
  const dragStartRef = useRef<number | null>(null)

  const goTo = (next: number) => {
    setPage(Math.min(Math.max(next, 0), lastIndex))
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') setPage((p) => Math.max(p - 1, 0))
      if (event.key === 'ArrowRight')
        setPage((p) => Math.min(p + 1, TUTORIAL_STEPS.length - 1))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartRef.current = event.clientX
    // 손가락이 모달 밖으로 나가도 놓는 순간을 받으려면 캡처가 필요하다.
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    if (start === null) return

    /*
      양 끝에서는 저항을 준다(1/3). 그냥 따라오게 두면 첫 페이지에서 오른쪽으로
      끌었을 때 빈 여백이 드러나 "뒤에 뭔가 더 있다"로 읽힌다.
    */
    const delta = event.clientX - start
    const isOverscroll =
      (page === 0 && delta > 0) || (page === lastIndex && delta < 0)
    setDragX(isOverscroll ? delta / 3 : delta)
  }

  const handlePointerUp = () => {
    if (dragStartRef.current === null) return

    if (dragX <= -SWIPE_THRESHOLD) goTo(page + 1)
    else if (dragX >= SWIPE_THRESHOLD) goTo(page - 1)

    dragStartRef.current = null
    setDragX(0)
  }

  const isDragging = dragStartRef.current !== null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-[clamp(16px,5vw,24px)]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // 카드 안쪽 클릭이 배경으로 전파되어 닫히는 것을 막는다.
        onClick={(event) => event.stopPropagation()}
        className="bg-surface w-full max-w-[430px] overflow-hidden rounded-3xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 id={titleId} className="text-ink text-[16px] font-bold">
            {t('start.tutorial.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="bg-surface-muted text-ink-muted flex size-8 items-center justify-center rounded-full text-[13px] active:brightness-95"
          >
            ✕
          </button>
        </div>

        {/*
          GIF 영역 — 세 페이지 공통 높이. 배경을 흰색으로 두는 것이 중요하다:
          남는 자리(최대 25.6%)가 GIF 배경과 같은 색이라 여백으로 보이지 않는다.
        */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ paddingBottom: TUTORIAL_MEDIA_PADDING_BOTTOM }}
          className="relative h-0 touch-none overflow-hidden bg-white select-none"
        >
          <div
            className={cn(
              'absolute inset-0 flex',
              !isDragging &&
                'transition-transform duration-300 ease-out motion-reduce:transition-none',
            )}
            style={{
              transform: `translateX(calc(${String(-page * 100)}% + ${String(dragX)}px))`,
            }}
          >
            {TUTORIAL_STEPS.map((step, index) => {
              const shouldLoad = index <= loadedUpTo

              return (
                <div
                  key={step.id}
                  aria-hidden={index !== page}
                  className="flex h-full w-full shrink-0 items-center justify-center"
                >
                  {shouldLoad ? (
                    <img
                      src={toTutorialGifUrl(step, language)}
                      alt={t(`start.tutorial.steps.${step.id}`)}
                      width={step.width}
                      height={step.height}
                      draggable={false}
                      /*
                        가운데 정렬 + object-contain 이라 남는 자리가 위아래(또는
                        좌우)에 똑같이 나뉜다. 한쪽으로 치우치지 않는 이유다.
                        GIF 자체에 콘텐츠 바깥 2% 여백이 들어 있어(가공 스크립트)
                        그림이 박스 경계에 닿지도 않는다.
                      */
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* 넘기기 — 화살표 + 점. 스와이프를 모르는 사용자를 위한 장치다. */}
        <div className="flex items-center justify-between px-5 pt-3.5">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
            aria-label={t('start.tutorial.prev')}
            className="text-ink-muted border-line flex size-9 items-center justify-center rounded-full border disabled:opacity-30"
          >
            <ChevronIcon className="size-4 rotate-180" />
          </button>

          <div className="flex items-center gap-2">
            {TUTORIAL_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={t('start.tutorial.goToStep', {
                  current: index + 1,
                  total: TUTORIAL_STEPS.length,
                })}
                aria-current={index === page}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === page ? 'bg-brand w-5' : 'bg-line w-2',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page === lastIndex}
            aria-label={t('start.tutorial.next')}
            className="text-ink-muted border-line flex size-9 items-center justify-center rounded-full border disabled:opacity-30"
          >
            <ChevronIcon className="size-4" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-5">
          <Button fullWidth variant="secondary" onClick={onClose}>
            {t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}
