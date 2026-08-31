import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const packageVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string
  return {
    base: env.VITE_BASE_PATH || '/',
    define: { __TENSORNOTE_VERSION__: JSON.stringify(packageVersion) },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        buffer: 'buffer/',
      },
    },
    server: {
      port: 5173,
    },
  }
})
