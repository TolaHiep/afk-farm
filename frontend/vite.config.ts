import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react(), tailwindcss()],
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
