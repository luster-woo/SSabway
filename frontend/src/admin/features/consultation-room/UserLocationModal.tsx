import { useMemo } from 'react'
import { isAxiosError } from 'axios'

import {
  StationMapOverlay,
  type StationMapStatus,
} from '@/shared/station-map/StationMapOverlay'
import { DAEGU_NODES } from '@/shared/station-map/daeguNavigation'
import type { RouteStepRef } from '@/shared/station-map/routePath'
import type { ApiErrorBody } from '@/shared/types/api'
import { useUserLocation } from '@/admin/features/consultation-room/useUserLocation'

export interface UserLocationModalProps {
  consultationId: number
  onClose: () => void
}

/**
 * 사용자 위치 보기.
 *
 * 사용자 앱의 "역 내에서 현재 위치 보기"와 **같은 화면**(shared/station-map/
 * StationMapOverlay)에, 역무원용 위치 조회(`GET /staffs/consultations/{id}/
 * location`, ✅ BE 8/5 신설)가 준 현재 위치 노드를 **점 하나로** 띄운다.
 *
 * 경로선은 그리지 않는다 — BE 가 주는 것이 위치 노드 하나뿐이다. 사용자가
 * 상담 요청에 실어 보낸 값(요청 시점에 마지막으로 보고 있던 안내 단계의
 * from)이므로, "도움을 요청한 지점"으로 읽어야 한다 (useUserLocation 참고).
 *
 * 관리자 전용이던 층 탭·시설 범례·자체 줌은 8/5 에 없앴고(공용 오버레이로
 * 통합), 이 컴포넌트에 남는 일은 위치를 조회해 오버레이에 넘기는 것뿐이다.
 */
/** 404 저장된 위치 없음(CONSULTATION_LOCATION_NOT_FOUND)인지. */
function isLocationNotFound(error: unknown): boolean {
  if (!isAxiosError(error)) return false
  const code = (error.response?.data as ApiErrorBody | undefined)?.code
  return code === 'CONSULTATION_LOCATION_NOT_FOUND'
}

export function UserLocationModal({
  consultationId,
  onClose,
}: UserLocationModalProps) {
  const {
    data: nodeId,
    isPending,
    isError,
    error,
  } = useUserLocation(consultationId, true)

  // 응답 노드가 도면 그래프에 없으면(서버·도면 데이터 불일치) 그릴 수 없다.
  const isUnknownNode = nodeId !== undefined && !DAEGU_NODES[nodeId]

  /*
    지도에 필요한 것은 "현재 위치 점" 하나지만, 오버레이의 데이터 소스는
    경로 단계(steps)다. from === to 인 단계 하나로 감싸면 경로선·화살촉은
    길이 0이라 그려지지 않고 내 위치 마커만 남는다 — 오버레이에 위치 전용
    모드를 따로 파는 것보다, 사용자 화면과 같은 코드가 그대로 도는 쪽을 택했다.
    (다음 위치 고리도 from === to 면 그리지 않는다 — StationRouteMap 참고)
  */
  const steps = useMemo<RouteStepRef[]>(
    () =>
      nodeId && !isUnknownNode
        ? [{ edgeId: '', from: nodeId, to: nodeId }]
        : [],
    [nodeId, isUnknownNode],
  )

  /*
    조회 중·실패도 오버레이 안에서 보여준다.

    사용자 화면은 경로가 준비된 뒤에 지도를 열지만, 역무원은 버튼을 누른
    뒤에 조회가 시작되므로 이 화면에는 대기 상태가 존재한다. 껍데기(헤더·
    닫기)는 그대로 두고 지도 자리만 바꿔야 닫을 방법이 사라지지 않는다.
  */
  const status: StationMapStatus | undefined = isPending
    ? { kind: 'loading', message: '사용자 위치를 불러오는 중…' }
    : isError
      ? {
          kind: 'error',
          // 404 CONSULTATION_LOCATION_NOT_FOUND 는 "저장된 위치가 없음"이라
          // 통신 실패와 다르게 안내한다. (사용자가 상세 안내를 연 적 없어
          // 서버에 보관된 currentNodeId 가 없을 때 서버가 이 코드를 준다)
          message: isLocationNotFound(error)
            ? '사용자의 역 내 위치 정보가 없습니다.'
            : '사용자 위치를 불러오지 못했습니다.',
        }
      : !nodeId || isUnknownNode
        ? { kind: 'error', message: '사용자의 역 내 위치 정보가 없습니다.' }
        : undefined

  return (
    <StationMapOverlay
      steps={steps}
      currentIndex={0}
      status={status}
      // 경로 없이 위치 점만 그리므로 경로선 범례를 빼고 '내 위치'만 남긴다.
      legend="locationOnly"
      // 관리자 화면은 한국어 고정 — 위 안내문과 지도 헤더의 언어를 맞춘다.
      lang="ko"
      onClose={onClose}
    />
  )
}
