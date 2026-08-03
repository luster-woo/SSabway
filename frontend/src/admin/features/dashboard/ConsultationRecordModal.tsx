import { cn } from '@/shared/lib/cn'
import { AdminButton } from '@/admin/ui/AdminButton'
import { Modal } from '@/admin/ui/Modal'

export interface ConsultationRecordModalProps {
  userEmail: string
  /** AI 요약. 아직 생성되지 않은 상담은 null 이다. */
  summary: string | null
  /**
   * GET /staffs/consultations 의 recordUrl (S3 presigned URL).
   *
   * null 이면 녹취가 아직 없거나 업로드에 실패한 상담이다. 조회 자체는 성공이므로
   * 모달은 열고, 요약만 보여주고 플레이어와 원본 링크를 감춘다.
   */
  recordUrl: string | null
  onClose: () => void
}

/**
 * 원본 상담 내역.
 *
 * 녹취 오디오 플레이어와 원본 링크, AI 요약을 함께 보여준다.
 * 이메일·요약은 목록 값이 아니라 이 API 의 응답을 우선한다 — 목록을 받은 뒤
 * 요약이 갱신됐을 수 있다.
 *
 * ⚠️ recordUrl 은 10분 뒤 만료된다(응답의 expiresIn). 모달을 오래 열어 둔 뒤
 *    재생하면 S3 가 403 을 주므로 닫고 다시 열어 새 URL 을 받아야 한다.
 *    아래 안내 문구가 그 역할을 한다.
 */
export function ConsultationRecordModal({
  userEmail,
  summary,
  recordUrl,
  onClose,
}: ConsultationRecordModalProps) {
  return (
    <Modal title="원본 상담 내역" onClose={onClose}>
      <p className="text-ink-muted text-[13px]">
        <span className="text-ink font-bold">{userEmail}</span> 님과의 상담
        녹취입니다.
      </p>

      <div className="bg-surface-muted mt-4 rounded-2xl px-4 py-3">
        <p className="text-ink-muted text-[12.5px] font-bold">AI 요약</p>
        <p className="text-ink mt-1.5 text-[13px]">
          {summary ?? '요약이 아직 생성되지 않았습니다.'}
        </p>
      </div>

      {recordUrl === null ? (
        <p
          role="status"
          className="text-ink-muted bg-surface-muted mt-5 rounded-2xl px-4 py-3 text-[13px]"
        >
          녹취 파일이 없어 재생할 수 없습니다. 녹음이 저장되지 않았거나 업로드가
          완료되지 않은 상담입니다.
        </p>
      ) : (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- 녹취 음성이라 자막 트랙이 없다 */}
          <audio className="mt-5 w-full" controls src={recordUrl} />
          <p className="text-ink-muted mt-2 text-[12px]">
            재생 링크는 10분 후 만료됩니다. 재생되지 않으면 창을 닫고 다시
            열어주세요.
          </p>
        </>
      )}

      <div className="mt-6 flex gap-2">
        {recordUrl === null ? null : (
          <a
            href={recordUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'border-line text-ink inline-flex h-11 flex-1 items-center justify-center',
              'rounded-2xl border text-sm font-bold whitespace-nowrap',
            )}
          >
            원본 열기
          </a>
        )}
        <AdminButton size="lg" className="flex-1" onClick={onClose}>
          닫기
        </AdminButton>
      </div>
    </Modal>
  )
}
