import type { ConsultationDetail } from '@/admin/features/consultation-room/useConsultationDetail'
import { toLanguageName } from '@/admin/lib/language'
import { AdminButton } from '@/admin/ui/AdminButton'

export interface ConsultationInfoPanelProps {
  detail: ConsultationDetail
  isBanPending?: boolean
  onViewLocation: () => void
  onRegisterBlacklist: () => void
  onEndConsultation: () => void
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="border-line border-b pb-4">
      <p className="text-ink-muted text-[12.5px]">{label}</p>
      <p className="text-ink mt-1.5 text-[14.5px] font-bold">{value}</p>
    </div>
  )
}

/** 우측 패널 — 상담 정보와 역무원 조작 버튼 */
export function ConsultationInfoPanel({
  detail,
  isBanPending = false,
  onViewLocation,
  onRegisterBlacklist,
  onEndConsultation,
}: ConsultationInfoPanelProps) {
  return (
    <section className="border-line bg-surface flex w-[340px] shrink-0 flex-col overflow-y-auto rounded-3xl border px-7 py-6">
      <h2 className="text-ink text-[19px] font-bold">상담 정보</h2>

      <div className="mt-5 flex flex-col gap-4">
        <InfoRow label="이메일" value={detail.email} />
        <InfoRow label="출발지" value={detail.startPoint} />
        <InfoRow label="목적지" value={detail.finalPoint} />
        <InfoRow label="언어" value={toLanguageName(detail.langCode)} />
      </div>

      <div className="text-ink-muted mt-7 flex flex-col gap-1.5 text-[12.5px]">
        <p>· 통화 음성이 녹음되고 있어요</p>
        <p>· 제3자 얼굴은 자동 모자이크 처리돼요</p>
      </div>

      <div className="mt-auto flex flex-col pt-8">
        <AdminButton
          variant="info"
          size="lg"
          fullWidth
          onClick={onViewLocation}
        >
          사용자 위치 보기
        </AdminButton>
        <p className="text-ink-muted mt-2 mb-5 text-center text-[12px]">
          사용자가 보낸 표지판 사진 위치 · 지도 표시
        </p>

        {detail.isBlack ? (
          <AdminButton variant="secondary" size="lg" fullWidth disabled>
            차단됨
          </AdminButton>
        ) : (
          <AdminButton
            variant="dangerOutline"
            size="lg"
            fullWidth
            disabled={isBanPending}
            onClick={onRegisterBlacklist}
          >
            {isBanPending ? '등록 중…' : '블랙리스트 등록'}
          </AdminButton>
        )}
        <p className="text-ink-muted mt-2 mb-5 text-center text-[12px]">
          등록 이후 상담 종료 부탁드립니다
        </p>

        <AdminButton
          variant="danger"
          size="lg"
          fullWidth
          onClick={onEndConsultation}
        >
          상담 종료
        </AdminButton>
      </div>
    </section>
  )
}
