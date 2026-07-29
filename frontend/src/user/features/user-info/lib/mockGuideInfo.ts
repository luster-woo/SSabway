import { ORIGIN_SOURCE, type GuideInfo } from '@/shared/types/guide'

/**
 * 안내 정보 확인 화면의 목 응답.
 *
 * 출발지는 표지판 인식(POST /routes/sign), 도착지는 목적지 설정 결과를
 * BE가 합쳐서 내려줄 예정이다. 그 전까지 화면을 만들기 위한 임시 데이터.
 *
 * TODO: BE 연동 시 이 파일을 삭제한다.
 */
export const MOCK_GUIDE_INFO: GuideInfo = {
  origin: {
    name: '홍대입구역 3번 출구',
    detail: '표지판 인식 결과',
    stationName: '홍대입구역',
    latitude: 37.557192,
    longitude: 126.923665,
  },
  destination: {
    name: '명동역',
    detail: '지도에서 선택',
    stationName: '명동역',
    latitude: 37.563446,
    longitude: 126.987206,
  },
  originSource: ORIGIN_SOURCE.SIGN,
}
