import { useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { localizeStationName } from '@/shared/lib/stationCoords'
import { useDestinationStore } from '@/shared/lib/store/useDestinationStore'
import { useOriginStationStore } from '@/shared/lib/store/useOriginStationStore'
import { useSelectedRouteStore } from '@/shared/lib/store/useSelectedRouteStore'
import { useStationNodeStore } from '@/shared/lib/store/useStationNodeStore'
import { useLanguage } from '@/shared/lib/useLanguage'
import type { RoutePathParams } from '@/shared/types/route'
import { IS_DEV } from '@/shared/lib/env'
import type { ApiErrorBody } from '@/shared/types/api'
import { Button, MobileScreen, useToast } from '@/shared/ui'
import { TripEndpointBar } from '@/shared/ui/TripEndpointBar'
import { RouteOptionCard } from '@/user/features/route-select/RouteOptionCard'
import { ChevronLeftIcon } from '@/user/features/route-select/icons'
import { toLangCode } from '@/user/features/auth/lib/language'
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
   * 출발지는 표지판 촬영으로 인식한 역(SIGN)이 기본이고, 목적지 화면 지도에서
   * 사용자가 직접 고르면(MANUAL) 그 값이 우선한다.
   *
   * ⚠️ 폴백을 두지 않는다. 예전에는 값이 없으면 대구역으로 대신 조회했는데,
   *    사용자가 고르지도 않은 출발지의 경로를 보여주는 셈이라 잘못된 안내였다.
   *    지금은 조회 자체를 하지 않고 "출발지를 정해 주세요" 안내를 띄운다.
   *    (엉뚱한 좌표로 400/404 를 받는 일도 함께 사라진다)
   */
  const originStation = useOriginStationStore((state) => state.originStation)
  const setSelectedRoute = useSelectedRouteStore(
    (state) => state.setSelectedRoute,
  )
  const setFinalPoint = useStationNodeStore((state) => state.setFinalPoint)

  /*
    표지판 인식이 준 역 이름은 한국어 원문이라(스토어는 그 원문을 들고 있다)
    표시할 때만 사용자 언어 표기로 바꾼다. 지도에서 직접 고른 장소는 원문 그대로.
  */
  const originName = localizeStationName(originStation?.name, t)
  const destinationName = destination?.name ?? null

  /** 두 지점이 다 정해져야 조회할 수 있다. */
  const hasEndpoints = !!originStation && !!destination

  /**
   * 요청 본문. 다섯 필드 모두 필수라 하나라도 빠지면 400 이다.
   *
   * language 는 역명 표기 언어를 정한다(ODsay 가 번역해 준다). 대문자 코드로
   * 보내야 하며, 소문자면 서버의 enum 역직렬화가 실패해 400 이다.
   *
   * 지점이 없으면 좌표가 0 인 요청이 만들어지지만, 아래 useRoutePaths 의
   * enabled 가 false 라 실제로 나가지는 않는다. (훅 규칙상 조건부 호출을 할 수
   * 없어 객체는 항상 만든다)
   */
  const params = useMemo<RoutePathParams>(
    () => ({
      language: toLangCode(language),
      startX: originStation?.longitude ?? 0,
      startY: originStation?.latitude ?? 0,
      endX: destination?.longitude ?? 0,
      endY: destination?.latitude ?? 0,
    }),
    [language, originStation, destination],
  )

  const { data, isPending, isError, error, refetch } = useRoutePaths(
    params,
    hasEndpoints,
  )

  /*
    실패 원인을 문구로 나눈다. 전부 "불러오지 못했어요"로 뭉치면 사용자도
    개발자도 무엇을 고쳐야 할지 알 수 없다 — 서버 설정 문제와 "그 구간에 경로가
    없음"은 대응이 완전히 다르다.

    ssabway 는 실패 응답에 항상 code 를 싣는다(ApiResponse.error).
  */
  const failure = useMemo<{ key: string; params?: { status: number } }>(() => {
    if (!isAxiosError(error)) return { key: 'route.select.failed' }

    // 응답 자체가 없으면 서버에 닿지 못한 것이다(미기동·프록시 대상 오류).
    if (!error.response) return { key: 'route.select.failedNetwork' }

    const status = error.response.status
    const code = (error.response.data as ApiErrorBody | undefined)?.code

    if (code === 'SUBWAY_ROUTE_NOT_FOUND')
      return { key: 'route.select.failedNoRoute' }
    if (code === 'EXTERNAL_API_ERROR')
      return { key: 'route.select.failedOdsay' }

    /*
      이 API 가 내는 실패는 위 둘뿐이다. 그 밖의 응답은 요청이 RouteController
      까지 닿지 못했다는 뜻이라 상태 코드를 드러낸다.

      특히 401 — SecurityConfig 가 /api/v1/routes/** 를 permitAll 로 열어 두었는데도
      401 이면 그 설정이 없던 옛 빌드가 떠 있는 것이다. 로그인해도 해결되지 않으므로
      "로그인이 필요합니다"를 그대로 보여주면 안 된다.
    */
    if (IS_DEV) {
      console.error('[route] 예상과 다른 실패 응답', {
        status,
        code,
        url: error.config?.url,
        data: error.response.data,
      })
    }
    return { key: 'route.select.failedUnexpected', params: { status } }
  }, [error])
  const paths = data ?? []
  // 의존성은 data로 둔다. paths는 매 렌더 새 배열이라 메모이제이션이 무효화된다.
  const badges = useMemo(() => toRouteBadges(data ?? []), [data])

  const [selectedIndex, setSelectedIndex] = useState(0)

  const startGuide = (index: number) => {
    const path = paths[index]
    if (!path) return
    setSelectedIndex(index)

    /*
      첫 지하철 구간의 개찰구 노드를 역 내 안내의 도착점(finalPoint)으로 담는다.
      담지 않으면 resolveStationNodes 가 파일럿 기본값(GA0_01)으로 폴백해, 어떤
      노선·방면을 골라도 항상 같은 개찰구로 안내한다. pointCode 가 null 이면 BE 가
      승강장을 특정하지 못한 것이라 안내를 시작하지 않는다.
    */
    const pointCode = path.segments[0]?.pointCode ?? null
    if (pointCode === null) {
      showToast(t('route.select.noIndoorGuide'))
      return
    }
    setFinalPoint(pointCode)
    /*
      고른 경로를 스토어에 담는다. 다음 화면들(안내 정보 확인·도착 완료)과
      상담 요청이 이 값의 **역 이름**을 쓴다 — 형제 화면이라 props 로 넘길 수
      없고, 상담은 서버가 역 이름으로 역무원을 배정하므로 사용자가 고른
      장소명("경북대 북문")이 아니라 도착역("수성알파시티")이어야 한다.
    */
    setSelectedRoute(path)
    showToast(t('route.select.started', { station: path.lastEndStation }))
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
            className="text-ink mt-0.5 -ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full"
          >
            <ChevronLeftIcon className="size-5" strokeWidth={2} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-ink text-[clamp(23px,6.6vw,27px)] leading-tight font-extrabold">
              {t('route.select.title')}
            </h1>
            {/* 지도 화면과 같은 컴포넌트라 어느 구간을 보고 있는지 표기가 흔들리지 않는다. */}
            <TripEndpointBar
              className="mt-1.5"
              originName={originName}
              destinationName={destinationName}
            />
          </div>
        </div>
      }
      footer={
        <p className="text-ink-muted text-center text-[11.5px] leading-relaxed">
          {t('route.select.notice')}
        </p>
      }
    >
      {!hasEndpoints ? (
        /*
          출발지나 도착지가 없으면 조회를 하지 않는다(useRoutePaths enabled=false).
          비어 있는 요청으로 404 를 받아 "경로 없음"을 보여주면 사용자는 경로가
          없는 줄 알지만, 실제로는 아직 아무것도 고르지 않은 상태다.
        */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {originStation
              ? t('route.select.needDestination')
              : t('route.select.needOrigin')}
          </p>
          <Button
            variant="secondary"
            onClick={() => void navigate('/destination')}
          >
            {t('route.select.pickOnMap')}
          </Button>
        </div>
      ) : null}

      {hasEndpoints && isPending ? (
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

      {hasEndpoints && isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-muted text-[13.5px] whitespace-pre-line">
            {t(failure.key, failure.params)}
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {hasEndpoints && !isPending && !isError && paths.length === 0 ? (
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
