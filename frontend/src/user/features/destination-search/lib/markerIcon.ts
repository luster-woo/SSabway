/** 마커 크기(px). anchor 계산과 맞물려 있으니 함께 바꿀 것. */
const WIDTH = 34
const HEIGHT = 44

/**
 * 목적지 마커 아이콘.
 *
 * 이미지 대신 인라인 SVG를 쓰는 이유: 별도 요청이 없고, 브랜드 색상 토큰이
 * 바뀌어도 여기 한 곳만 고치면 된다.
 */
export function buildDestinationMarkerIcon(): naver.maps.MarkerIcon {
  return {
    content: `
      <div style="position:relative;width:${WIDTH}px;height:${HEIGHT}px;">
        <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 43C17 43 32 27.5 32 17A15 15 0 1 0 2 17C2 27.5 17 43 17 43Z"
                fill="#018abe" stroke="#02457a" stroke-width="2" stroke-linejoin="round" />
          <circle cx="17" cy="17" r="5.6" fill="#ffffff" />
        </svg>
      </div>
    `,
    anchor: new naver.maps.Point(WIDTH / 2, HEIGHT),
  }
}
