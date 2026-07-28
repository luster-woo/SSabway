import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [
    react(),
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
        navigateFallbackDenylist: [/^\/admin/, /^\/agent/],
        // ② admin 청크와 런타임 설정 파일은 precache 대상에서 제외
        globIgnores: [
          '**/assets/admin-*',
          '**/assets/agent-*',
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
        // ④ admin, agent 코드를 각각 별도 청크로 분리
        //    위 globIgnores 와 짝을 이룸
        manualChunks(id) {
          const p = id.replace(/\\/g, '/')
          if (p.includes('/src/admin/')) return 'admin'
          if (p.includes('/src/agent/')) return 'agent'
        },
      },
    },
  },
  server: { host: true }, // 폰에서 로컬 개발 서버 접속용
})
