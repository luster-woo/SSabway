import { useTranslation } from 'react-i18next'

import type { GuideInfo } from '@/shared/types/guide'
import { Card } from '@/shared/ui'
import { EndpointRow } from '@/user/features/user-info/EndpointRow'
import { FlagIcon, PinIcon } from '@/user/features/user-info/icons'

export interface GuideEndpointCardProps {
  info: GuideInfo
  /** 출발지 '재촬영' — 표지판 촬영 화면으로 보낸다. */
  onChangeOrigin: () => void
  /** 도착지 '변경' — 목적지 설정(지도) 화면으로 보낸다. */
  onChangeDestination: () => void
  /**
   * 있으면 출발 아이콘이 깜빡이는 버튼이 되어 역 내 위치 지도를 연다.
   * 표지판으로 인식한 노드가 도면에 있을 때만 넘어온다 (UserInfoPage 참고).
   */
  onShowOriginLocation?: () => void
}

/** 출발지 → 도착지를 한 장에 묶어 보여주는 카드 */
export function GuideEndpointCard({
  info,
  onChangeOrigin,
  onChangeDestination,
  onShowOriginLocation,
}: GuideEndpointCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="p-0">
      <EndpointRow
        label={info.origin}
        icon={<PinIcon className="size-[18px]" />}
        onChange={onChangeOrigin}
        changeLabel={t('userInfo.rescan')}
        onIconClick={onShowOriginLocation}
        iconLabel={t('userInfo.originLocation')}
        className="px-4 pt-4 pb-3"
      />

      {/*
        아이콘 열은 비우고 텍스트 열부터 선을 그어 두 지점이 이어져 보이게 한다.
        오른쪽 끝은 [재촬영]·[변경] 버튼의 오른쪽 모서리에 맞춘다.
          ml 64px = 행 좌측 여백 16 + 아이콘 원 36 + 사이 간격 12
          mr 16px = 행 우측 여백과 같은 값
      */}
      <div className="border-line mr-4 ml-[64px] border-t" />

      <EndpointRow
        label={info.destination}
        icon={<FlagIcon className="size-[18px]" />}
        onChange={onChangeDestination}
        changeLabel={t('userInfo.change')}
        className="px-4 pt-3 pb-4"
      />
    </Card>
  )
}
