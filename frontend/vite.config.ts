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
      // ① admin 경로는 SW의 네비게이션 폴백에서 제외
      pwaAssets: { config: true },
      devOptions: { enabled: false, type: 'module' },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/admin/],
        // ② admin 청크와 런타임 설정 파일은 precache 대상에서 제외
        globIgnores: ['**/assets/admin-*', '**/config.js'],
                runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.s3\..*\.amazonaws\.com\/.*\.(png|jpg|jpeg|webp)$/,
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
        name: 'Station Guide',
        short_name: 'StationGuide',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1e6fd9',
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // ③ admin 코드를 'admin'이라는 이름의 별도 청크로 강제 분리
        //    → assets/admin-[hash].js 로 떨어지고, 위 globIgnores와 짝을 이룸
        manualChunks(id) {
          if (id.includes('/src/admin/')) return 'admin'
        },
      },
    },
  },
  server: { host: true }, // 폰에서 로컬 개발 서버 접속용
})