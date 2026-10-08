/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 알림 처리를 위해 직접 만든 서비스워커(src/sw.ts)를 쓴다 (CR-008).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Cross Reading',
        short_name: 'Cross Reading',
        description: '사주·성향으로 시작하는 우리 이야기',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#334e68',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
