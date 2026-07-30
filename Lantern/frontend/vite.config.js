import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // VITE_API_URL を空にしてAPIパスを相対にしているため、
    // 開発時はここでローカルのFlask（main.py / :5000）へ転送する。
    proxy: {
      '/api': 'http://localhost:5000',
      '/save': 'http://localhost:5000',
    },
  },
})
