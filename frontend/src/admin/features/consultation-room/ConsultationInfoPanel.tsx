import type { ConsultationDetail } from '@/admin/features/consultation-room/useConsultationDetail'
import { toLanguageName } from '@/admin/lib/language'
import { AdminButton } from '@/admin/ui/AdminButton'

export interface ConsultationInfoPanelProps {
  detail: ConsultationDetail
  /**
   * 이번 통화 중에 블랙리스트로 등록했는지.
   *
   * 블랙리스트 사용자는 화상 연결 자체가 거부되므로 상담방에 들어온 시점에는
   * 항상 false 다. 등록 직후 버튼을 잠가 재등록을 막는 용도다.
   */
  isBlacklisted?: boolean
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
  isBlacklisted = false,
  isBanPending = false,
  onViewLocation,
  onRegisterBlacklist,
  onEndConsultation,
}: ConsultationInfoPanelProps) {
  return (
    /*
      패널은 overflow-hidden 으로 높이를 뷰포트에 맡기고 안에서 두 영역으로
      나눈다. 위(상담 정보)는 길어지면 스크롤되고, 아래 버튼 푸터는 shrink-0 로
      항상 바닥에 붙어 [상담 종료] 가 낮은 화면(노트북)에서도 접히지 않는다.
    */
    <section className="border-line bg-surface flex w-[340px] shrink-0 flex-col overflow-hidden rounded-3xl border">
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-6 pb-4">
        <h2 className="text-ink text-[19px] font-bold">상담 정보</h2>

        <div className="mt-5 flex flex-col gap-4">
          <InfoRow label="이메일" value={detail.email} />
          <InfoRow label="출발지" value={detail.startPoint} />
          <InfoRow label="목적지" value={detail.finalPoint} />
          <InfoRow label="언어" value={toLanguageName(detail.langCode)} />
        </div>

        <div className="text-ink-muted mt-6 flex flex-col gap-1.5 text-[12.5px]">
          <p>· 통화 음성이 녹음되고 있어요</p>
          <p>· 제3자 얼굴은 자동 모자이크 처리돼요</p>
        </div>
      </div>

      <div className="border-line shrink-0 border-t px-7 py-5">
        <AdminButton
          variant="info"
          size="lg"
          fullWidth
          onClick={onViewLocation}
        >
          사용자 위치 보기
        </AdminButton>
        <p className="text-ink-muted mt-1.5 mb-3 text-center text-[12px]">
          사용자가 보낸 표지판 사진 위치 · 지도 표시
        </p>

        {isBlacklisted ? (
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
        <p className="text-ink-muted mt-1.5 mb-3 text-center text-[12px]">
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
