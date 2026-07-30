/**
 * 도착 완료 화면에 보여줄 이동 요약.
 *
 * BE가 안내 세션 종료 시점에 내려줄 값이라 지금은 목 데이터를 쓴다.
 * TODO: BE 연동 시 이 파일을 삭제하고 API 응답으로 교체한다.
 */
export interface ArrivalSummary {
  /** 화면에 크게 보여줄 도착지 이름 ("경북대 북문") */
  destinationName: string
  /** 도착지 영문 표기 ("KNU North Gate") */
  destinationSubtitle: string
  /** 총 소요 시간 ("24분") */
  duration: string
  /** 출발지 ("대구역 3번 출구") */
  originName: string
}

export const MOCK_ARRIVAL_SUMMARY: ArrivalSummary = {
  destinationName: '경북대 북문',
  destinationSubtitle: 'KNU North Gate',
  duration: '24분',
  originName: '대구역 3번 출구',
}
