window.__ENV__ = {
  // 빈 문자열 = 상대 경로. client.ts 의 baseURL 이 '/api/v1' 이 되어
  // 항상 현재 접속한 오리진으로 요청이 나간다.
  //
  //   dev  → vite.config.ts 의 server.proxy 가 백엔드로 전달
  //   배포 → deploy/nginx.conf 의 location /api/ 가 api:8080 으로 전달
  //
  // 그래서 환경별로 이 값을 바꿀 필요가 없다. 절대 주소를 다시 넣으면
  // 배포 환경에서 사용자 브라우저의 localhost 를 가리켜 깨진다.
  // 붙일 백엔드를 바꾸려면 frontend/.env.local 의 VITE_PROXY_TARGET 을 쓴다.
  API_BASE_URL: '',
  // 네이버 클라우드 플랫폼 > Maps 애플리케이션의 Client ID.
  // Client Secret은 서버 전용이므로 여기에 넣지 않는다.
  // 콘솔의 Web 서비스 URL 에 접속 도메인이 등록돼 있어야 지도가 뜬다.
  // (S15P11D104-322 에서 목적지 지도는 구글로 교체 — 네이버 코드는 롤백용 보존)
  NAVER_MAP_CLIENT_ID: 'pumqt2h9m1',
  // Google Maps Platform API 키 (Maps JavaScript API + Places API 활성화 필요).
  // 프론트에 노출되는 public 값이며, 실제 방어선은 콘솔의 HTTP 리퍼러 제한이다.
  // 허용 리퍼러에 접속 도메인(로컬은 http://localhost:5173/*)을 등록할 것.
  // ⚠️ 아래 따옴표 안에 발급받은 키를 붙여넣으세요. 비어 있으면 지도가 안 뜹니다.
  GOOGLE_MAPS_API_KEY: 'AIzaSyAXZclOQXwLQTQsWbduijK1cWx-VNMPeDM',
  // Google Cloud Console > 사용자 인증 정보 > OAuth 클라이언트 ID (웹 애플리케이션).
  // 프론트에 노출되는 public 값이다. Client Secret 은 서버 전용이라 여기에 넣지 않는다.
  // 콘솔의 "승인된 자바스크립트 원본"에 접속 오리진이 등록돼 있어야 동작한다.
  // (리디렉션 URI 가 아니다. 로컬은 http://localhost:5173)
  GOOGLE_CLIENT_ID:
    '719352113387-r5stvku567sapsg850mpjfet14cq5vvr.apps.googleusercontent.com',
  // MSW 목 서버 사용 여부 (개발 모드에서만 동작).
  // BE 미완성 API를 프론트 단독으로 확인할 때 true.
  // 실제 서버로 붙여볼 때, PWA 동작을 확인할 때는 false 로 되돌린다.
  USE_MSW: true,
}
