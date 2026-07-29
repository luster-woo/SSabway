import { useTranslation } from 'react-i18next'

import type { GuideInfo } from '@/shared/types/guide'
import { Card } from '@/shared/ui'
import { EndpointRow } from '@/user/features/user-info/EndpointRow'
import { FlagIcon, PinIcon } from '@/user/features/user-info/icons'

export interface GuideEndpointCardProps {
  info: GuideInfo
  /** 출발지 '변경' — 표지판 촬영 화면으로 보낸다. */
  onChangeOrigin: () => void
}

/** 출발지 → 도착지를 한 장에 묶어 보여주는 카드 */
export function GuideEndpointCard({
  info,
  onChangeOrigin,
}: GuideEndpointCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="p-0">
      <EndpointRow
        kind={t('userInfo.origin')}
        endpoint={info.origin}
        icon={<PinIcon className="size-[18px]" />}
        onChange={onChangeOrigin}
        changeLabel={t('userInfo.change')}
        className="px-4 pt-4 pb-3"
      />

      {/* 아이콘 열은 비우고 텍스트 열부터 선을 그어 두 지점이 이어져 보이게 한다. */}
      <div className="border-line ml-[64px] border-t" />

      <EndpointRow
        kind={t('userInfo.destination')}
        endpoint={info.destination}
        icon={<FlagIcon className="size-[18px]" />}
        className="px-4 pt-3 pb-4"
      />
    </Card>
  )
}
