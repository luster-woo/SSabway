/**
 * 역 내 노드 id → 사람이 읽는 위치 표기.
 *
 * 표지판 인식(POST /ai/signs/predict)이 돌려주는 것은 `S3_16` 같은 노드 id 뿐이다.
 * 그대로 화면에 뿌리면 "대구역 S3_16" 이 되어 사용자가 읽을 수 없다. 이 모듈이
 * 그 id 를 "대구역 3층 6번 출구 앞" 처럼 옮긴다.
 *
 * 매핑 자체는 `daeguPointLandmarks.json` 에 있다(원본: docs/map/daegu_navigation.json).
 *   SIGNAGE  — 좌표상 가장 가까운 비-SIGNAGE 노드(출구·개찰구·엘리베이터·편의시설)
 *   그 외    — 자기 자신
 * 표지판에는 "여기가 어디다" 를 말해 줄 이름이 없어서, 옆에 있는 시설을 빌려 쓴다.
 *
 * 문구는 로케일의 `landmark.*` 에 있다 — 사용자가 처음 고른 언어로 나온다.
 * 데이터는 층·시설 종류·출구 번호만 들고 있고 문장은 전부 로케일이 만든다.
 */

import landmarkData from '@/shared/station-map/daeguPointLandmarks.json'

/** 매핑 표가 다루는 역(한국어 표기). 다른 역이면 노드 id 체계가 달라 쓸 수 없다. */
const LANDMARK_STATION = landmarkData.station

/** 한 노드의 위치 표기 재료. `nearest`·`distanceM` 은 근거 값이라 화면에는 쓰지 않는다. */
interface PointLandmark {
  /** 로케일 `landmark.place.*` 의 키 (exit·gate·elevator·store·atm·…) */
  place: string
  /** 출구 번호. `place === 'exit'` 일 때만 있다 */
  number?: number
  /** 층. `"0"`(지상 레벨)인 노드는 아예 없다 — 그 경우 층을 빼고 말한다 */
  floor?: string
  /** 랜드마크가 코앞(15m 이내)이면 true. false 면 "앞" 대신 "근처" 로 눅인다 */
  near: boolean
}

const POINTS: Record<string, PointLandmark | undefined> = landmarkData.points

/**
 * 화면에 쓸 출구 번호 덮어쓰기 (데이터 번호 → 실제 표지판 번호).
 *
 * 데이터의 출구 번호는 노드 id 끝자리에서 나온다(EX0_05→5, EX0_06→6). 그런데
 * 실제 대구역 표지판에서는 그 출구들이 각각 2번·1번으로 안내돼서, UI 표기만
 * 실제 번호에 맞춘다 — EX0_06(3층 쪽)=1번, EX0_05(2층 쪽)=2번.
 *
 * 같은 번호(1번·2번)가 다른 지점에도 나오는 것은 같은 출구를 여러 층에서
 * 가리키기 때문이라 겹쳐 보여도 문제가 아니다. 출구 번호는 EX 노드마다 유일해서
 * (5는 EX0_05, 6은 EX0_06뿐) 번호로 바꿔도 다른 출구를 건드리지 않는다.
 *
 * ⚠️ 이건 표기용 보정이다. 원본 데이터(daeguPointLandmarks.json)의 number 는
 *    그대로 두고(생성기 재실행 시 되돌아가지 않게), 여기서만 갈아 끼운다.
 */
const EXIT_NUMBER_OVERRIDE: Record<number, number | undefined> = {
  5: 2,
  6: 1,
}

/** t 함수의 최소 형태. i18next TFunction 의 제네릭에 묶이지 않게 좁혀 받는다. */
type TranslateFn = (key: string, options?: Record<string, unknown>) => string

export interface DescribePointParams {
  /** 역 내 노드 id (예: `S3_16`). 없으면 역 이름만 돌려준다 */
  nodeId: string | null | undefined
  /** 화면에 쓸 역 이름 — 이미 사용자 언어로 온 값 (SelectedRoute.departureStation) */
  stationLabel: string
  /**
   * 역 이름의 한국어 표기 (SelectedRoute.departureStationKor).
   * 매핑 표가 이 역의 것인지 확인하는 데만 쓴다 — 다른 역이면 같은 id 가 전혀
   * 다른 곳을 가리키므로, 틀린 위치를 그럴듯하게 보여주느니 id 를 그대로 둔다.
   */
  stationKor: string
  t: TranslateFn
}

/**
 * 노드 id 를 "대구역 3층 6번 출구 앞" 같은 한 줄로 만든다.
 *
 * 매핑에 없는 id(그래프에 없는 노드, 지원하지 않는 역)는 `"대구역 S9_99"` 처럼
 * 지금까지의 표기를 그대로 돌려준다 — 화면이 비는 것보다는 코드라도 보이는 편이 낫다.
 */
export function describeStationPoint({
  nodeId,
  stationLabel,
  stationKor,
  t,
}: DescribePointParams): string {
  if (!nodeId) return stationLabel

  const landmark = stationKor === LANDMARK_STATION ? POINTS[nodeId] : undefined
  if (!landmark) return `${stationLabel} ${nodeId}`

  // 출구는 실제 표지판 번호로 갈아 끼운다(EXIT_NUMBER_OVERRIDE). 그 외 시설은
  // number 를 쓰지 않으므로 landmark.number 를 그대로 넘겨도 무해하다.
  const displayNumber =
    landmark.place === 'exit' && landmark.number !== undefined
      ? (EXIT_NUMBER_OVERRIDE[landmark.number] ?? landmark.number)
      : landmark.number

  const place = t(`landmark.place.${landmark.place}`, {
    number: displayNumber,
  })

  // 층이 없는 노드(지상 레벨의 출구·개찰구·편의시설)는 "{역} {장소}" 로 줄인다
  const proximity = landmark.near ? 'at' : 'near'
  const formatKey = landmark.floor
    ? `landmark.${proximity}`
    : `landmark.${proximity}NoFloor`

  return t(formatKey, { station: stationLabel, floor: landmark.floor, place })
}
