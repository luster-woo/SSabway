export interface Station {
  stationId: number
  nameKo: string
  nameEn: string
  region: string
}

/**
 * GPS로 찾은 최근접 역 (이름 + 좌표).
 * 시작 화면의 "가까운 역" 표시와, 목적지 지도에서 "내 위치(파란 원)"를 그 역 위치에
 * 찍는 데 쓴다. (내부 도면용 Station 과 달리 실세계 위경도를 갖는다.)
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
