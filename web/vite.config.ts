import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import { ripApi } from './api/plugin.ts'

export default defineConfig({
  plugins: [solid(), ripApi()],
  server: { port: 5173, host: '127.0.0.1', strictPort: false },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
