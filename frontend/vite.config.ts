import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_PORT = 5173
const DEFAULT_BACKEND = 'http://localhost:8000'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_DEV_PORT ?? DEFAULT_PORT)
  const backend = env.VITE_PROXY_TARGET ?? DEFAULT_BACKEND

  return {
    base: '/app/',
    plugins: [react()],
    server: {
      port,
      host: true,
      proxy: {
        '/api': { target: backend, changeOrigin: true, secure: false },
        '/health': { target: backend, changeOrigin: true, secure: false },
        '/import': { target: backend, changeOrigin: true, secure: false },
        '/export': { target: backend, changeOrigin: true, secure: false },
        '/settings': { target: backend, changeOrigin: true, secure: false },
        '/login': { target: backend, changeOrigin: true, secure: false },
        '/logout': { target: backend, changeOrigin: true, secure: false },
        '/change-password': { target: backend, changeOrigin: true, secure: false },
      },
    },
  }
})
