import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import { useOriginStationStore } from '@/shared/lib/store/useOriginStationStore'
import { useLanguage } from '@/shared/lib/useLanguage'
import type { RoutePathParams } from '@/shared/types/route'
import { Button, MobileScreen, useToast } from '@/shared/ui'
import { RouteOptionCard } from '@/user/features/route-select/RouteOptionCard'
import { ChevronLeftIcon } from '@/user/features/route-select/icons'
import { toLangCode } from '@/user/features/auth/lib/language'
import {
  FALLBACK_DESTINATION,
  FALLBACK_ORIGIN,
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

  const { language } = useLanguage()
  const destination = useDestinationStore((state) => state.destination)
  /**
   * 출발지는 시작 화면의 GPS 결과를 쓴다. 아직 못 잡았거나 위치 동의 전이면
   * 폴백(대구역)으로 조회한다 — BE 가 지원하는 출발역이 현재 대구역뿐이라,
   * 폴백이 다른 역이면 서버가 경로를 전부 걸러내고 404 를 준다.
   *
   * TODO: 표지판 인식(/routes/sign)이 붙으면 그 결과를 최우선으로 둔다.
   */
  const originStation = useOriginStationStore((state) => state.originStation)
  const origin = originStation ?? FALLBACK_ORIGIN

  const originName = origin.name
  const destinationName = destination?.name ?? FALLBACK_DESTINATION.name

  /**
   * 요청 본문. 다섯 필드 모두 필수라 하나라도 빠지면 400 이다.
   *
   * language 는 역명 표기 언어를 정한다(ODsay 가 번역해 준다). 대문자 코드로
   * 보내야 하며, 소문자면 서버의 enum 역직렬화가 실패해 400 이다.
   */
  const params = useMemo<RoutePathParams>(
    () => ({
      language: toLangCode(language),
      startX: origin.longitude,
      startY: origin.latitude,
      endX: destination?.longitude ?? FALLBACK_DESTINATION.longitude,
      endY: destination?.latitude ?? FALLBACK_DESTINATION.latitude,
    }),
    [language, origin, destination],
  )

  const { data, isPending, isError, refetch } = useRoutePaths(params)
  const paths = data ?? []
  // 의존성은 data로 둔다. paths는 매 렌더 새 배열이라 메모이제이션이 무효화된다.
  const badges = useMemo(() => toRouteBadges(data ?? []), [data])

  const [selectedIndex, setSelectedIndex] = useState(0)

  const startGuide = (index: number) => {
    const path = paths[index]
    if (!path) return
    setSelectedIndex(index)
    showToast(t('route.select.started', { station: path.lastEndStation }))
    // TODO: 선택한 경로를 스토어에 담아 안내 정보 확인 화면으로 넘긴다.
    void navigate('/user-info')
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
              key={`${path.firstStartStation}-${path.lastEndStation}-${path.totalTime}-${path.transferCount}`}
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
