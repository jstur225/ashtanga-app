import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    // L5 真实云端测试需要独立的 .env.test 和 node 环境，由 vitest.config.e2e.ts 单独运行
    exclude: ['__tests__/L5/**', 'node_modules/**'],
    setupFiles: ['__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
