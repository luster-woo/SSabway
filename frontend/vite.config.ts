import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// 실제 모바일에서 테스트할 때만 주석 해제할 것.
// import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  /**
   * dev 서버가 API 요청을 넘길 대상.
   *
   * 앱 코드는 항상 상대 경로(`/api/v1`, `/signal`)로 요청하고, 어디로 보낼지는
   * 이 프록시가 결정한다. 배포 환경에서는 같은 역할을 `deploy/nginx.conf`가 한다.
   * (`location /api/` → api:8080, `location /signal/` → signaling:8080)
   *
   * 폰 실기기 테스트가 이 방식으로 그냥 된다. 폰은 상대 경로로 dev 서버에 보내고,
   * 프록시는 노트북에서 돌기 때문에 노트북의 백엔드로 전달된다.
   * (절대 주소였다면 폰 자신의 localhost 를 가리켜 실패했다.)
   *
   * 기본값은 로컬에서 직접 띄운 백엔드다.
   * 다른 곳으로 붙여볼 때는 `frontend/.env.local`에 적는다.
   * (`.gitignore`의 `*.local`에 걸리므로 커밋되지 않는다.)
   *
   *   # 배포된 백엔드 — nginx가 /api 와 /signal 을 모두 라우팅하므로 한 줄로 끝난다
   *   VITE_PROXY_TARGET=https://k15d104.p.ssafy.io
   *
   *   # docker compose 로 띄운 api 컨테이너 (override.yml 에서 127.0.0.1:8081)
   *   VITE_PROXY_TARGET=http://localhost:8081
   *
   * 시그널링 서버(ssabway_webrtc)는 로컬에서 api 와 별개 프로세스라 포트가 다르다.
   * 그 경우에만 VITE_SIGNAL_TARGET 을 따로 지정한다. 지정하지 않으면 API 와 같은
   * 곳으로 보내므로 배포 주소를 쓸 때는 신경 쓸 필요가 없다.
   *
   *   VITE_SIGNAL_TARGET=http://localhost:8082
   */
  const envVars = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = envVars.VITE_PROXY_TARGET || 'http://localhost:8080'
  const signalTarget = envVars.VITE_SIGNAL_TARGET || apiTarget

  return {
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    plugins: [
      react(),
      // 폰 실기기에서 카메라(getUserMedia)를 쓰려면 보안 컨텍스트가 필요하다.
      // sign-capture 와 consultation 두 기능이 여기에 걸린다.
      // 자체 서명 인증서라 첫 접속 때 브라우저 경고가 뜬다 — 무시하고 진행.
      // 실제 모바일에서 테스트할 때만 주석 해제할 것.
      // basicSsl(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // 아이콘 생성은 pwa-assets.config.ts 에 위임 (manifest.icons 자동 주입)
        pwaAssets: { config: true },
        // 개발 중 캐시 혼란 방지 — PWA 동작을 확인할 때만 true 로 변경
        devOptions: { enabled: false, type: 'module' },
        workbox: {
          navigateFallback: 'index.html',
          // ① admin 과 백엔드 경로는 SW 네비게이션 폴백에서 제외
          //    /api, /signal 이 없으면 SW 가 API 요청에 index.html 을 돌려줄 수 있다
          navigateFallbackDenylist: [/^\/admin/, /^\/api/, /^\/signal/],
          // ② admin 청크와 런타임 설정 파일은 precache 대상에서 제외
          globIgnores: [
            '**/assets/admin-*',
            '**/config.js',
            // 개발 전용 목 서버 워커. 빌드 산출물에 복사되지만 등록되지 않으므로
            // precache 대상에서 제외한다.
            '**/mockServiceWorker.js',
            '**/mediapipe/**',
            '**/models/**',
          ],
          // ③ 표지판 이미지는 런타임 캐싱 (지하 약전파 구간 대응)
          runtimeCaching: [
            {
              urlPattern:
                /^https:\/\/.*\.s3\..*\.amazonaws\.com\/.*\.(png|jpg|jpeg|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'sign-images',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          id: '/',
          name: 'Station Guide',
          short_name: 'StationGuide',
          description: 'Indoor navigation for subway stations',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#ffffff',
          theme_color: '#1e6fd9',
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // ④ admin 코드를 별도 청크로 분리
          //    위 globIgnores 와 짝을 이룸
          manualChunks(id: string) {
            const p = id.replace(/\\/g, '/')
            if (p.includes('/src/admin/')) return 'admin'
          },
        },
      },
    },
    server: {
      host: true, // 폰에서 로컬 개발 서버 접속용
      /**
       * 프록시를 두는 이유는 CORS 회피만이 아니다.
       * `client.ts`는 `withCredentials: true`로 리프레시 토큰 쿠키를 주고받는데,
       * cross-origin이면 그 쿠키에 `SameSite=None; Secure`가 필요해서 http 로컬에서는
       * 브라우저가 거부한다. 프록시로 same-origin이 되면 `SameSite=Lax`로 그냥 붙는다.
       *
       * MSW 핸들러의 BASE 는 와일드카드로 시작하므로 상대 경로에도 그대로 매칭된다.
       */
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        // WebRTC 시그널링 (backend/ssabway_webrtc). WebSocket 업그레이드 필요.
        '/signal': {
          target: signalTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
