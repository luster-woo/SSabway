import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import type { RoutePathParams } from '@/shared/types/route'
import { Button, MobileScreen, useToast } from '@/shared/ui'
import { RouteOptionCard } from '@/user/features/route-select/RouteOptionCard'
import { ChevronLeftIcon } from '@/user/features/route-select/icons'
import {
  MOCK_DESTINATION,
  MOCK_ORIGIN,
} from '@/user/features/route-select/lib/mockRoutePaths'
import { toRouteBadges } from '@/user/features/route-select/lib/routeBadge'
import { useRoutePaths } from '@/user/features/route-select/useRoutePaths'

/**
 * 4. 경로 선택 — 추천 경로 후보를 비교해 하나를 고르는 화면.
 *
 * 카드를 탭하면 선택이 바뀌고, 카드 안의 버튼을 누르면 역 내 안내로 넘어간다.
 * 첫 카드(가장 빠른 경로)가 기본 선택이다.
 */
export default function RoutePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const destination = useDestinationStore((state) => state.destination)
  // TODO: 출발지는 표지판 분석·GPS 결과가 스토어에 들어오면 그 값으로 교체한다.
  const originName = MOCK_ORIGIN.name
  const destinationName = destination?.name ?? MOCK_DESTINATION.name

  const params = useMemo<RoutePathParams>(
    () => ({
      startX: MOCK_ORIGIN.longitude,
      startY: MOCK_ORIGIN.latitude,
      endX: destination?.longitude ?? MOCK_DESTINATION.longitude,
      endY: destination?.latitude ?? MOCK_DESTINATION.latitude,
    }),
    [destination],
  )

  const { data, isPending, isError, refetch } = useRoutePaths(params)
  const paths = data ?? []
  const badges = useMemo(() => toRouteBadges(paths), [paths])

  const [selectedIndex, setSelectedIndex] = useState(0)

  const startGuide = (index: number) => {
    const path = paths[index]
    if (!path) return
    setSelectedIndex(index)
    // TODO: 역 내 안내(경로 상세) 화면이 붙으면 선택한 경로와 함께 이동한다.
    showToast(t('route.select.started', { station: path.lastEndStation }))
  }

  return (
    <MobileScreen
      header={
        // 뒤로가기와 제목은 한 줄, 부제는 제목 왼쪽 끝에 맞춰 아래로 붙는다.
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            aria-label={t('route.select.back')}
            onClick={() => void navigate(-1)}
            className="text-ink -ml-1.5 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
          >
            <ChevronLeftIcon className="size-5" strokeWidth={2} />
          </button>

          <div className="min-w-0">
            <h1 className="text-ink text-[clamp(23px,6.6vw,27px)] leading-tight font-extrabold">
              {t('route.select.title')}
            </h1>
            <p className="text-ink-muted mt-1.5 text-[13.5px]">
              {originName} → {destinationName}
            </p>
          </div>
        </div>
      }
      footer={
        <p className="text-ink-muted text-center text-[11.5px] leading-relaxed">
          {t('route.select.notice')}
        </p>
      }
    >
      {isPending ? (
        <div
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-3"
        >
          <span
            aria-hidden
            className="border-line border-t-brand size-9 animate-spin rounded-full border-4"
          />
          <p className="text-ink-muted text-[13px]">
            {t('route.select.loading')}
          </p>
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t('route.select.failed')}
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {!isPending && !isError && paths.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t('route.select.empty')}
          </p>
          <Button
            variant="secondary"
            onClick={() => void navigate('/destination')}
          >
            {t('route.select.changeDestination')}
          </Button>
        </div>
      ) : null}

      {paths.length > 0 ? (
        <div
          role="radiogroup"
          aria-label={t('route.select.title')}
          className="flex flex-col gap-3 pt-4 pb-2"
        >
          {paths.map((path, index) => (
            <RouteOptionCard
              key={`${path.firstStartStation}-${path.lastEndStation}-${path.arriveTime}`}
              path={path}
              badge={badges[index] ?? null}
              selected={index === selectedIndex}
              onSelect={() => setSelectedIndex(index)}
              onStart={() => startGuide(index)}
            />
          ))}
        </div>
      ) : null}
    </MobileScreen>
  )
}
