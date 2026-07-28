export interface Station {
  stationId: number
  nameKo: string
  nameEn: string
  region: string
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
