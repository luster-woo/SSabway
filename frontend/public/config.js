window.__ENV__ = {
  API_BASE_URL: 'http://localhost:8080',
  // 네이버 클라우드 플랫폼 > Maps 애플리케이션의 Client ID.
  // Client Secret은 서버 전용이므로 여기에 넣지 않는다.
  // 로컬 개발용 기본값이다. 배포 환경에서는 이 파일을 환경별 값으로 교체해야 한다.
  // TODO: nginx 이미지에 entrypoint를 붙여 환경변수로 이 파일을 생성하도록 할 것.
  NAVER_MAP_CLIENT_ID: 'pumqt2h9m1',
  // MSW 목 서버 사용 여부 (개발 모드에서만 동작).
  // BE 미완성 API를 프론트 단독으로 확인할 때 true.
  // 실제 서버로 붙여볼 때, PWA 동작을 확인할 때는 false 로 되돌린다.
  USE_MSW: true,
}
