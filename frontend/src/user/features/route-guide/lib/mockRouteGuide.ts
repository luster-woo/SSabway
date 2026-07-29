import { SIGN_DIRECTION, type RouteGuide } from '@/shared/types/routeGuide'

/** 2호선 라인컬러 */
const LINE_2 = '#00a54f'
/** 4호선 라인컬러 */
const LINE_4 = '#00a5de'

/**
 * 경로 상세 안내 화면의 목 응답.
 *
 * 표지판 사진(photoUrl)은 S3에 올라간 실사 이미지를 받을 예정이라 지금은 null로 두고,
 * 화면에서는 표지판을 직접 그려 보여준다.
 *
 * TODO: BE 연동(GET /routes/navi) 시 이 파일을 삭제한다.
 */
export const MOCK_ROUTE_GUIDE: RouteGuide = {
  steps: [
    {
      order: 1,
      instruction: '정면 표지판을 확인하고 왼쪽 통로로 이동하세요',
      sign: {
        exitNumber: null,
        title: '승차권 발매기 · 고객안내센터',
        subtitle: 'Ticket Machine · Information',
        lineBadge: null,
        direction: SIGN_DIRECTION.LEFT,
        photoUrl: null,
      },
    },
    {
      order: 2,
      instruction: '3번 출구 방향으로 직진하세요',
      sign: {
        exitNumber: '3',
        title: '3 · 4번 출구 방면',
        subtitle: 'To Exits 3 · 4',
        lineBadge: { label: '4', color: LINE_4 },
        direction: SIGN_DIRECTION.UP,
        photoUrl: null,
      },
    },
    {
      order: 3,
      instruction: '교통카드를 태그하고 개찰구를 통과하세요',
      sign: {
        exitNumber: null,
        title: '개찰구',
        subtitle: 'Gates',
        lineBadge: null,
        direction: SIGN_DIRECTION.STRAIGHT,
        photoUrl: null,
      },
    },
    {
      order: 4,
      instruction: '에스컬레이터를 타고 2호선 승강장으로 내려가세요',
      sign: {
        exitNumber: null,
        title: '2호선 승강장',
        subtitle: 'Line 2 Platform',
        lineBadge: { label: '2', color: LINE_2 },
        direction: SIGN_DIRECTION.DOWN,
        photoUrl: null,
      },
    },
    {
      order: 5,
      instruction: '합정 방향 열차를 타고 목적지 역으로 이동하세요',
      sign: {
        exitNumber: null,
        title: '합정 · 홍대입구 방면',
        subtitle: 'Toward Hapjeong · Hongik Univ.',
        lineBadge: { label: '2', color: LINE_2 },
        direction: SIGN_DIRECTION.RIGHT,
        photoUrl: null,
      },
    },
  ],
}
