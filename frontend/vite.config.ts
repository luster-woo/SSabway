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
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/admin/],
        // ② admin 청크와 런타임 설정 파일은 precache 대상에서 제외
        globIgnores: ['**/assets/admin-*', '**/config.js'],
      },
      manifest: {
        name: 'Station Guide',
        short_name: 'StationGuide',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1e6fd9',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
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