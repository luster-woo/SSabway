/** 마커 크기(px). anchor 계산과 맞물려 있으니 함께 바꿀 것. */
const WIDTH = 34
const HEIGHT = 44

/** 인라인 SVG 마커. 별도 이미지 요청 없이 브랜드 색상 토큰만 여기서 관리한다. */
const MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 34 44" fill="none"><path d="M17 43C17 43 32 27.5 32 17A15 15 0 1 0 2 17C2 27.5 17 43 17 43Z" fill="#018abe" stroke="#02457a" stroke-width="2" stroke-linejoin="round"/><circle cx="17" cy="17" r="5.6" fill="#ffffff"/></svg>`

/**
 * 목적지 마커 아이콘 (Google 지도용).
 *
 * new google.maps.Size/Point 는 SDK 로드 후에만 호출 가능하므로, 이 함수는
 * 반드시 지도 준비(isReady)가 끝난 뒤 — 마커 생성 시점에 — 호출해야 한다.
 */
export function buildDestinationMarkerIcon(): google.maps.Icon {
  return {
    url: `data:image/svg+xml,${encodeURIComponent(MARKER_SVG)}`,
    scaledSize: new google.maps.Size(WIDTH, HEIGHT),
    anchor: new google.maps.Point(WIDTH / 2, HEIGHT),
  }
}

/** "내 위치" 파란 점 크기(px). */
const MY_LOCATION_SIZE = 24

/** 구글 지도 기본 "현재 위치"와 비슷한 파란 점(반투명 후광 + 흰 테두리). */
const MY_LOCATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${MY_LOCATION_SIZE}" height="${MY_LOCATION_SIZE}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#4285F4" fill-opacity="0.2"/><circle cx="12" cy="12" r="6" fill="#4285F4" stroke="#ffffff" stroke-width="2.5"/></svg>`

/** SVG <text> 안에 들어갈 문자열을 안전하게 이스케이프한다. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

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
  const CHAR_W = 13 // 한글 폭을 감안한 넉넉한 글자 너비
  const GAP = 6 // 점과 알약 사이 간격
  const PAD_X = 9 // 알약 좌우 안쪽 여백
  const PILL_H = 22
  const PILL_Y = (DOT - PILL_H) / 2

  const text = escapeXml(label)
  const pillTextW = Math.max(label.length * CHAR_W, 16)
  const pillW = pillTextW + PAD_X * 2
  const pillX = DOT + GAP
  const totalW = pillX + pillW
  const textX = pillX + PAD_X
  const textY = DOT / 2 + FONT * 0.36 // 세로 중앙에 가깝게

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${DOT}" viewBox="0 0 ${totalW} ${DOT}">` +
    `<rect x="${pillX}" y="${PILL_Y}" width="${pillW}" height="${PILL_H}" rx="${PILL_H / 2}" fill="#ffffff" stroke="#02457a" stroke-width="1.5"/>` +
    `<text x="${textX}" y="${textY}" font-family="'Apple SD Gothic Neo','Malgun Gothic',sans-serif" font-size="${FONT}" font-weight="700" fill="#02457a">${text}</text>` +
    `<circle cx="12" cy="12" r="11" fill="#4285F4" fill-opacity="0.2"/>` +
    `<circle cx="12" cy="12" r="6" fill="#4285F4" stroke="#ffffff" stroke-width="2.5"/>` +
    `</svg>`

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(totalW, DOT),
    anchor: new google.maps.Point(DOT / 2, DOT / 2),
  }
}
