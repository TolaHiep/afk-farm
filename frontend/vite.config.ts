import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Proxy /api,/files về backend Frappe (container cổng 8000). Đặt Host=akf.localhost để
// Frappe phân giải đúng site; cookieDomainRewrite để session cookie dùng được trên localhost dev.
const backend = {
  target: 'http://127.0.0.1:8000',
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
    proxy: {
      '/api': backend,
      '/files': backend,
      '/assets': backend,
    },
  },
})
