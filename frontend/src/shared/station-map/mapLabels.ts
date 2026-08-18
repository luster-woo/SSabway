import { DAEGU_MAP_SVG } from '@/shared/station-map/daeguMap'

/**
 * 도면(daeguMap.ts)에 한국어로 박혀 있는 장소 명칭 → i18n 키.
 *
 * ## 왜 사전이 필요한가
 *
 * `DAEGU_MAP_SVG` 는 `docs/map/daegu_map.svg` 에서 기계 생성한 **정적 문자열**이고,
 * 장소 이름이 `<text>상점</text>` 처럼 마크업 안에 그대로 들어 있다. 지도를
 * `dangerouslySetInnerHTML` 로 통째로 심기 때문에 React 가 이 텍스트를 알지 못해
 * `t()` 를 끼워 넣을 자리가 없다. 그래서 렌더 직전에 문자열 치환으로 갈아 끼운다.
 *
 * ## 왜 daeguMap.ts 를 직접 고치지 않는가
 *
 * 그 파일은 "직접 고치지 말고 원본 SVG 에서 재생성" 이 규칙이다(파일 상단 주석).
 * 번역을 그 안에 넣으면 지도를 다시 내보낼 때마다 날아간다. 사전을 밖에 두면
 * 도면이 갱신돼도 이 파일만 맞춰 주면 된다.
 *
 * ## 새 라벨이 생기면
 *
 * 사전에 없는 텍스트는 **원문 그대로 남는다**(치환 실패가 화면을 깨뜨리지 않는다).
 * 도면을 재생성한 뒤 아래 명령으로 빠진 라벨을 찾아 4개 로케일에 함께 추가한다.
 *
 * ```sh
 * grep -oP '(?<=>)[^<>]*(?=</text>)' src/shared/station-map/daeguMap.ts \
 *   | grep -P '[가-힣]' | sort -u
 * ```
 *
 * 키는 `routeGuide.stationMap.label.*` 아래에 둔다(오버레이의 헤더·범례와 같은 묶음).
 */
const MAP_LABEL_KEY: Record<string, string> = {
  상점: 'shop',
  흡연장: 'smokingArea',
  롯데백화점: 'lotteDepartmentStore',
  백화점: 'departmentStore',
  중앙: 'center',
  주차장: 'parking',
  회의실: 'meetingRoom',
  경찰서: 'policeStation',
  식당: 'restaurant',
  수유실: 'nursingRoom',
  '대경선 (구미방면)': 'daegyeongLineGumi',
  '대경선 (경산방면)': 'daegyeongLineGyeongsan',
  '1번 승강장) 서울 / 대전 / 영주 / 김천 방면': 'platform1',
  '6번 승강장 ) 부산 / 진주 / 부전 / 신해운대 방면': 'platform6',
  '대구역 1번 출구': 'daeguStationExit1',
  '대구역 2번 출구': 'daeguStationExit2',
  '대구역 3번 출구': 'daeguStationExit3',
  '대구역 4번 출구': 'daeguStationExit4',
}

/** 사전에 실린 라벨 수 — 테스트·점검용 */
export const MAP_LABEL_COUNT = Object.keys(MAP_LABEL_KEY).length

/**
 * `<text …>내용</text>` 한 덩어리.
 *
 * 내용 부분을 `[^<]*` 로 잡아 다음 태그를 넘어가지 않게 한다. 도면의 `<text>` 는
 * 전부 자식 엘리먼트 없는 단순 텍스트라(`<tspan>` 없음) 이걸로 충분하다.
 */
const TEXT_ELEMENT = /(<text\b[^>]*>)([^<]*)(<\/text>)/g

/**
 * 번역문을 SVG 텍스트 노드에 넣기 전 이스케이프.
 *
 * 로케일 값은 우리가 쓰는 정적 문자열이라 실제 위험은 없지만, `&`·`<` 가 섞이면
 * 마크업이 깨지므로(도면 전체가 사라진다) 방어한다. `&` 를 먼저 바꿔야
 * 뒤에서 만든 엔티티를 두 번 이스케이프하지 않는다.
 */
function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** t 함수의 최소 형태. i18next TFunction 의 제네릭에 묶이지 않게 좁혀 받는다. */
type TranslateFn = (key: string, options?: { defaultValue?: string }) => string

/**
 * 언어별 결과 캐시.
 *
 * 도면 문자열이 100KB 가 넘어 정규식 치환이 가볍지 않은데, 번역 리소스는 런타임에
 * 바뀌지 않으므로 언어당 한 번만 만들면 된다. 지도를 닫았다 다시 열어도 재사용된다.
 */
const CACHE = new Map<string, string>()

/**
 * 도면 SVG 의 장소 명칭을 해당 언어로 바꾼 마크업을 돌려준다.
 *
 * 사전에 없는 텍스트(시설 코드 `S1_04`, 브랜드 `MUJI`·`UNIQLO`, 이모지, `1F`…)는
 * 손대지 않는다. 좌표·글꼴·앵커 속성도 그대로라 도면 모양은 변하지 않는다.
 *
 * @param language 캐시 키. `translate` 가 실제로 쓰는 언어와 같아야 한다.
 * @param translate `routeGuide.stationMap.label.*` 를 찾을 t 함수
 */
export function toLocalizedMapSvg(
  language: string,
  translate: TranslateFn,
): string {
  const cached = CACHE.get(language)
  if (cached !== undefined) return cached

  const localized = DAEGU_MAP_SVG.replace(
    TEXT_ELEMENT,
    (whole, openTag: string, body: string, closeTag: string) => {
      // 원문에 앞뒤 공백이 섞인 라벨이 있다(" 상점"). 조회는 다듬어서 한다.
      const key = MAP_LABEL_KEY[body.trim()]
      if (key === undefined) return whole

      const text = translate(`routeGuide.stationMap.label.${key}`, {
        // 번역이 비어 있어도 지도에서 이름이 사라지지 않게 원문으로 되돌린다.
        defaultValue: body.trim(),
      })
      return `${openTag}${escapeXmlText(text)}${closeTag}`
    },
  )

  CACHE.set(language, localized)
  return localized
}
