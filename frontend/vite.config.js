import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.VITE_API_HOST || 'http://localhost:8000',
      '/photos': process.env.VITE_API_HOST || 'http://localhost:8000',
    }
  }
})
