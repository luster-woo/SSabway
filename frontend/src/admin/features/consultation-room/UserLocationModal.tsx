import {
  StationMapOverlay,
  type StationMapStatus,
} from '@/shared/station-map/StationMapOverlay'
import { useUserRoute } from '@/admin/features/consultation-room/useUserRoute'

export interface UserLocationModalProps {
  consultationId: number
  onClose: () => void
}

/**
 * 사용자 위치 보기.
 *
 * 사용자 앱의 "역 내에서 현재 위치 보기"와 **완전히 같은 화면**을 띄운다
 * (shared/station-map/StationMapOverlay). 역무원이 통화하면서 "지금 파란 점이
 * 있는 곳에서 왼쪽으로" 같이 말로 짚어야 하므로, 두 사람이 서로 다른 지도를
 * 보고 있으면 대화가 어긋난다.
 *
 * 그래서 관리자 전용이던 것들은 없앴다 (8/5):
 *   - 층 탭 — 사용자 지도는 도면 한 장에 모든 층이 그려져 있어 층 개념이 없다
 *   - 시설 아이콘 범례 — 사용자에게 보이지 않는 정보라 기준이 갈린다
 *   - 자체 줌·드래그 구현 — 오버레이가 핀치·휠·더블탭·± 를 모두 갖고 있다
 *
 * 이 컴포넌트에 남는 일은 경로를 조회해 오버레이에 넘기는 것뿐이다.
 */
export function UserLocationModal({
  consultationId,
  onClose,
}: UserLocationModalProps) {
  const { data, isPending, isError } = useUserRoute(consultationId, true)

  /*
    조회 중·실패도 오버레이 안에서 보여준다.

    사용자 화면은 경로가 준비된 뒤에 지도를 열지만, 역무원은 버튼을 누른
    뒤에 조회가 시작되므로 이 화면에는 대기 상태가 존재한다. 껍데기(헤더·
    닫기)는 그대로 두고 지도 자리만 바꿔야 닫을 방법이 사라지지 않는다.
  */
  const status: StationMapStatus | undefined = isPending
    ? { kind: 'loading', message: '사용자 경로를 불러오는 중…' }
    : isError
      ? { kind: 'error', message: '사용자 경로를 불러오지 못했습니다.' }
      : !data || data.steps.length === 0
        ? {
            kind: 'error',
            message: '아직 사용자의 역 내 경로가 없습니다.',
          }
        : undefined

  return (
    <StationMapOverlay
      steps={data?.steps ?? []}
      currentIndex={data?.currentIndex ?? 0}
      status={status}
      // 관리자 화면은 한국어 고정 — 위 안내문과 지도 헤더의 언어를 맞춘다.
      lang="ko"
      onClose={onClose}
    />
  )
}
