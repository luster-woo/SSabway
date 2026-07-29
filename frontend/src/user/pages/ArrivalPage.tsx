import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button, CheckIcon, MobileScreen, useToast } from '@/shared/ui'
import { ArrivalSummaryCard } from '@/user/features/arrival/ArrivalSummaryCard'
import { MOCK_ARRIVAL_SUMMARY } from '@/user/features/arrival/lib/mockArrivalSummary'

/**
 * 6-1. 도착 완료 — 안내가 끝난 뒤 이동을 정리하는 화면.
 *
 * 이동 요약과 만족도 피드백을 보여주고, 새 목적지 안내로 이어준다.
 * 요약 값은 BE가 안내 세션 종료 시 내려줄 예정이라 지금은 목 데이터를 쓴다.
 */
export default function ArrivalPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // TODO: BE 연동 시 안내 세션 요약 조회로 교체한다.
  const summary = MOCK_ARRIVAL_SUMMARY

  const startNewGuide = () => {
    void navigate('/scan')
  }

  return (
    <MobileScreen
      header={
        <button
          type="button"
          aria-label={t('arrival.back')}
          onClick={() => void navigate(-1)}
          className="text-ink -ml-1.5 flex size-8 items-center justify-center rounded-full"
        >
          <span aria-hidden className="text-2xl">
            ‹
          </span>
        </button>
      }
      footer={
        <Button size="lg" fullWidth onClick={startNewGuide}>
          {t('arrival.newDestination')}
        </Button>
      }
    >
      <div className="flex flex-1 flex-col gap-7 pt-8 pb-2">
        {/* 도착 축하 — 연한 원 위에 그라디언트 체크 원을 겹친다. */}
        <div className="flex flex-col items-center gap-5 pt-4 text-center">
          <span className="bg-brand-soft flex size-[124px] items-center justify-center rounded-full">
            <span
              aria-hidden
              className="bg-brand-gradient flex size-20 items-center justify-center rounded-full text-white"
            >
              <CheckIcon className="size-10" strokeWidth={2.6} />
            </span>
          </span>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-ink text-[clamp(20px,6vw,22px)] leading-tight font-extrabold">
              {t('arrival.title')}
            </h1>
            <p className="text-ink-muted text-[14px]">
              {summary.destinationName} · {summary.destinationSubtitle}
            </p>
          </div>
        </div>

        <ArrivalSummaryCard summary={summary} />
      </div>
    </MobileScreen>
  )
}
