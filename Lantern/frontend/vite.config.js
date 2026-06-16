import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/save': 'http://localhost:5000',
      '/goals': 'http://localhost:5000',
    },
  },
})
