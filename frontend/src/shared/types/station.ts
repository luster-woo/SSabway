export interface Station {
  stationId: number
  nameKo: string
  nameEn: string
  region: string
}

/**
 * 출발역 (이름 + 실세계 좌표).
 * 표지판 촬영으로 인식한 역(stationName)에 stationCoords 로 좌표를 붙여 만든다.
 * 목적지 지도의 "내 위치(파란 원)"·출발지 마커와 경로 조회(/routes/path 의
 * startX/startY)가 이 값을 쓴다. (내부 도면용 Station 과 달리 위경도를 갖는다.)
 */
export interface NearestStation {
  name: string
  latitude: number
  longitude: number
}

export const POINT_TYPE = {
  SIGN: 'SIGN',
  FACILITY: 'FACILITY',
  EXIT: 'EXIT',
  GATE: 'GATE',
  PLATFORM: 'PLATFORM',
} as const

export type PointType = (typeof POINT_TYPE)[keyof typeof POINT_TYPE]

export interface Point {
  pointId: number
  stationId: number
  type: PointType
  floor: number
}

export interface Edge {
  edgeId: number
  fromPointId: number
  toPointId: number
  weight: number
  photoUrl: string
  useStair: boolean
}
