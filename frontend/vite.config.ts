import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 폰 실기기 테스트 시 basicSsl() 주석을 풀 때 import도 함께 살린다.
// import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [
    react(),
    // 폰 실기기에서 카메라(getUserMedia)를 쓰려면 보안 컨텍스트가 필요하다.
    // 자체 서명 인증서라 첫 접속 때 브라우저 경고가 뜬다 — 무시하고 진행.
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
        // ① admin 경로는 SW 네비게이션 폴백에서 제외
        navigateFallbackDenylist: [/^\/admin/],
        // ② admin 청크와 런타임 설정 파일은 precache 대상에서 제외
        globIgnores: [
          '**/assets/admin-*',
          '**/config.js',
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
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
        manualChunks(id) {
          const p = id.replace(/\\/g, '/')
          if (p.includes('/src/admin/')) return 'admin'
        },
      },
    },
  },
  server: { host: true }, // 폰에서 로컬 개발 서버 접속용
})
