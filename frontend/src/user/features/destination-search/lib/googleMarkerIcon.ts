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

/**
 * "내 위치" 마커 아이콘 (Google 지도용).
 * 목적지 마커(물방울)와 구분되도록 파란 점으로 그린다. 앵커는 점 중앙.
 */
export function buildMyLocationIcon(): google.maps.Icon {
  return {
    url: `data:image/svg+xml,${encodeURIComponent(MY_LOCATION_SVG)}`,
    scaledSize: new google.maps.Size(MY_LOCATION_SIZE, MY_LOCATION_SIZE),
    anchor: new google.maps.Point(MY_LOCATION_SIZE / 2, MY_LOCATION_SIZE / 2),
  }
}
