import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    fs: {
      allow: ['..']
    },
    proxy: {
      '/submit': 'http://127.0.0.1:5000',
      '/results': 'http://127.0.0.1:5000',
      '/candidates': 'http://127.0.0.1:5000'
    }
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  }
})
