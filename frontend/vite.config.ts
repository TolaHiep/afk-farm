import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Proxy /api,/files về backend Frappe. Đặt Host=akf.localhost để Frappe phân giải đúng
// site; cookieDomainRewrite để session cookie dùng được trên localhost dev.
// Target lấy từ VITE_BACKEND_TARGET: chạy vite trên host -> 127.0.0.1:8000 (mặc định);
// chạy trong compose dev -> http://backend:8000 (service backend).
const backend = {
  target: process.env.VITE_BACKEND_TARGET || 'http://127.0.0.1:8000',
  changeOrigin: false,
  headers: { host: 'akf.localhost' },
  cookieDomainRewrite: 'localhost',
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: service worker precache app shell -> mở app khi offline lạnh (chỉ bản build/production).
    // autoUpdate: bản mới tự kích hoạt ở lần mở sau. Dev tắt SW để không phá hot-reload.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AKF — Quản lý sản xuất nông trại',
        short_name: 'AKF Farm',
        description: 'Hệ thống quản lý sản xuất nông trại AKF cho admin và tổ trưởng.',
        start_url: '/mobile/tasks',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#16a34a',
        background_color: '#f0fdf4',
        lang: 'vi',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        // Đừng trả index.html cho API/file/realtime (chúng không phải điều hướng trang)
        navigateFallbackDenylist: [/^\/api/, /^\/files/, /^\/private/, /^\/socket\.io/, /^\/assets\//],
        runtimeCaching: [
          {
            // GET của tổ trưởng (việc/lô/chi tiết): có mạng lấy mới, mất mạng lấy bản đã cache
            urlPattern: ({ url }) => url.pathname.startsWith('/api/method/akf_farm.api.field_api.'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'akf-field-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Cho phép Host từ tunnel Cloudflare (subdomain ngẫu nhiên *.trycloudflare.com).
    // Vite (bản mới) chặn Host lạ để chống DNS-rebinding; dấu "." đầu = khớp mọi subdomain.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': backend,
      '/files': backend,
      '/private': backend,
      '/assets': backend,
    },
  },
})
