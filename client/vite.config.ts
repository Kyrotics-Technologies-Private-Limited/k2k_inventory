import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { validateClientEnv } from './src/services/firebase/env'

// https://vite.dev/config/
export default defineConfig(({ command, mode, isPreview }) => {
  if (command === 'build' || (!isPreview && !process.env.VITEST)) {
    validateClientEnv(mode, loadEnv(mode, process.cwd()))
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5567',
          changeOrigin: true,
        },
      },
    },
  }
})
