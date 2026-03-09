import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Force un bundle différent à chaque déploiement (évite cache Vercel)
    __BUILD_ID__: JSON.stringify(process.env.VERCEL_BUILD_ID || Date.now()),
  },
  server: {
    port: 5178,
    strictPort: false,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
