/** 마커 크기(px). anchor 계산과 맞물려 있으니 함께 바꿀 것. */
const WIDTH = 34
const HEIGHT = 44
/** 핀 머리(흰 원)의 중심 y. 라벨 알약을 이 높이에 맞춘다. */
const HEAD_CY = 17

/**
 * 지점 종류별 색. `stroke` 는 핀 테두리이자 라벨의 글자·테두리 색이다.
 *
 * 목적지 핀은 지도에 언제나 하나만 뜬다 — 검색이나 지도 탭으로 다른 곳을 고르면
 * 지점을 하나 더 찍는 게 아니라 그 핀이 옮겨 간다. 이 화면에서 사용자가 하는
 * 일은 "목적지 다시 고르기"이지 "세 번째 지점 추가"가 아니기 때문이다.
 */
const PIN_COLOR = {
  /** 출발지 — 초록 */
  origin: { fill: '#0f9d58', stroke: '#0b6b3a' },
  /** 목적지 — 브랜드 파랑 */
  destination: { fill: '#018abe', stroke: '#02457a' },
} as const

/** SVG <text> 안에 들어갈 문자열을 안전하게 이스케이프한다. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 한글·한자·가나·전각 기호 — 라틴 문자보다 폭이 넓다. */
const WIDE_CHAR = /[ᄀ-ᇿ⺀-鿿가-힯＀-｠]/

/**
 * 라벨 폭 어림값(px).
 *
 * SVG 를 data URL 로 구워서 넘기기 때문에 실제 텍스트 폭을 잴 수 없다. CJK 는
 * 글자당 글꼴 크기만큼, 라틴 문자는 그 60% 로 잡는다. 넉넉한 쪽이 안전하다 —
 * 좁게 잡으면 글자가 알약 밖으로 삐져나온다.
 */
function estimateTextWidth(label: string, fontSize: number): number {
  let width = 0
  for (const char of label) {
    width += WIDE_CHAR.test(char) ? fontSize : fontSize * 0.6
  }
  return width
}

const LABEL_FONT = 12
const LABEL_PAD_X = 8
const LABEL_HEIGHT = 20
/** 핀과 라벨 알약 사이 간격. */
const LABEL_GAP = 3
const FONT_FAMILY = "'Apple SD Gothic Neo','Malgun Gothic',sans-serif"

/**
 * 물방울 핀 마커를 만든다. `label` 을 주면 핀 오른쪽에 흰 알약으로 붙는다.
 *
 * 앵커는 라벨 유무와 무관하게 항상 핀 끝(아래 꼭짓점)이라, 라벨을 붙여도
 * 마커가 가리키는 좌표는 달라지지 않는다.
 *
 * new google.maps.Size/Point 는 SDK 로드 후에만 호출 가능하므로, 이 함수는
 * 반드시 지도 준비(isReady)가 끝난 뒤 — 마커 생성 시점에 — 호출해야 한다.
 */
function buildPinIcon(
  color: { fill: string; stroke: string },
  label?: string,
): google.maps.Icon {
  const pin =
    `<path d="M17 43C17 43 32 27.5 32 17A15 15 0 1 0 2 17C2 27.5 17 43 17 43Z" fill="${color.fill}" stroke="${color.stroke}" stroke-width="2" stroke-linejoin="round"/>` +
    `<circle cx="17" cy="${HEAD_CY}" r="5.6" fill="#ffffff"/>`

  if (!label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none">${pin}</svg>`
    return {
      url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(WIDTH, HEIGHT),
      anchor: new google.maps.Point(WIDTH / 2, HEIGHT),
    }
  }

  const pillW = Math.round(
    estimateTextWidth(label, LABEL_FONT) + LABEL_PAD_X * 2,
  )
  const pillX = WIDTH + LABEL_GAP
  const pillY = HEAD_CY - LABEL_HEIGHT / 2
  const totalW = pillX + pillW
  // 글꼴 크기의 0.36배만큼 내려야 글자가 알약 세로 중앙에 온다.
  const textY = HEAD_CY + LABEL_FONT * 0.36

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${HEIGHT}" viewBox="0 0 ${totalW} ${HEIGHT}" fill="none">` +
    `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${LABEL_HEIGHT}" rx="${LABEL_HEIGHT / 2}" fill="#ffffff" stroke="${color.stroke}" stroke-width="1.5"/>` +
    `<text x="${pillX + LABEL_PAD_X}" y="${textY}" font-family="${FONT_FAMILY}" font-size="${LABEL_FONT}" font-weight="700" fill="${color.stroke}">${escapeXml(label)}</text>` +
    // 핀을 라벨보다 나중에 그려야 알약이 핀을 가리지 않는다.
    pin +
    `</svg>`

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(totalW, HEIGHT),
    anchor: new google.maps.Point(WIDTH / 2, HEIGHT),
  }
}

/**
 * 목적지 마커 아이콘 (Google 지도용).
 *
 * `label`(예: "목적지")을 주면 핀 옆에 붙어, 이 핀이 무엇인지 탭하지 않고도 읽힌다.
 */
export function buildDestinationMarkerIcon(label?: string): google.maps.Icon {
  return buildPinIcon(PIN_COLOR.destination, label)
}

/**
 * 출발지 마커 아이콘 (Google 지도용).
 *
 * 도착지와 같은 물방울 모양에 색만 다르다 — 모양까지 바꾸면 지도 위에서 두
 * 마커가 서로 다른 종류의 정보처럼 읽힌다. 둘은 같은 성격의 지점이고
 * 방향(출발/도착)만 다르므로 색과 라벨로 구분하는 편이 맞다.
 */
export function buildOriginMarkerIcon(label?: string): google.maps.Icon {
  return buildPinIcon(PIN_COLOR.origin, label)
}

/** "내 위치" 파란 점 크기(px). */
const MY_LOCATION_SIZE = 24

/** 구글 지도 기본 "현재 위치"와 비슷한 파란 점(반투명 후광 + 흰 테두리). */
const MY_LOCATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${MY_LOCATION_SIZE}" height="${MY_LOCATION_SIZE}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#4285F4" fill-opacity="0.2"/><circle cx="12" cy="12" r="6" fill="#4285F4" stroke="#ffffff" stroke-width="2.5"/></svg>`

/**
 * "내 위치" 마커 아이콘 (Google 지도용).
 *
 * label 이 없으면 파란 점만 그린다(기존 동작).
 * label 이 있으면 점 오른쪽에 흰 알약(pill)으로 역 이름을 붙여, 사용자의 현재
 * 위치가 "어느 역 부근"인지 지도 위에서 바로 읽히게 한다.
 *
 * 앵커는 항상 파란 점 중앙이라, 마커의 지리 좌표(실제 GPS 위치)는 점이 가리키고
 * 라벨은 그 옆에 떠 있는 형태가 된다.
 */
export function buildMyLocationIcon(label?: string): google.maps.Icon {
  if (!label) {
    return {
      url: `data:image/svg+xml,${encodeURIComponent(MY_LOCATION_SVG)}`,
      scaledSize: new google.maps.Size(MY_LOCATION_SIZE, MY_LOCATION_SIZE),
      anchor: new google.maps.Point(MY_LOCATION_SIZE / 2, MY_LOCATION_SIZE / 2),
    }
  }

  const DOT = MY_LOCATION_SIZE // 24
  const FONT = 13
  const GAP = 6 // 점과 알약 사이 간격
  const PAD_X = 9 // 알약 좌우 안쪽 여백
  const PILL_H = 22
  const PILL_Y = (DOT - PILL_H) / 2

  const text = escapeXml(label)
  const pillTextW = Math.max(estimateTextWidth(label, FONT), 16)
  const pillW = Math.round(pillTextW + PAD_X * 2)
  const pillX = DOT + GAP
  const totalW = pillX + pillW
  const textX = pillX + PAD_X
  const textY = DOT / 2 + FONT * 0.36 // 세로 중앙에 가깝게

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${DOT}" viewBox="0 0 ${totalW} ${DOT}">` +
    `<rect x="${pillX}" y="${PILL_Y}" width="${pillW}" height="${PILL_H}" rx="${PILL_H / 2}" fill="#ffffff" stroke="#02457a" stroke-width="1.5"/>` +
    `<text x="${textX}" y="${textY}" font-family="${FONT_FAMILY}" font-size="${FONT}" font-weight="700" fill="#02457a">${text}</text>` +
    `<circle cx="12" cy="12" r="11" fill="#4285F4" fill-opacity="0.2"/>` +
    `<circle cx="12" cy="12" r="6" fill="#4285F4" stroke="#ffffff" stroke-width="2.5"/>` +
    `</svg>`

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(totalW, DOT),
    anchor: new google.maps.Point(DOT / 2, DOT / 2),
  }
}
