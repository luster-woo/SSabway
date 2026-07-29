/** 지도에서 고른 목적지 후보 한 건. */
export interface Place {
  /** 리스트 key·중복 제거용. 검색 소스가 바뀌어도 유지되도록 좌표 기반으로 만든다. */
  placeId: string
  /** 목록·마커에 크게 보여줄 이름 (도로명 주소 또는 장소명) */
  name: string
  /** 보조 설명 (지번 주소 등). 없을 수 있다. */
  address: string
  latitude: number
  longitude: number
}
