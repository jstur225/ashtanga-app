import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

// L5 端到端测试专用 vitest 配置（ESM 格式）
//
// 与默认配置的区别：
//   - 环境: node（不需要 jsdom，避免污染）
//   - 只跑 L5 目录下的 .e2e.test.ts
//   - 超时延长到 30s（真实网络调用）
//   - 串行执行（避免账号并发请求干扰）
//
// .env.test 由 __tests__/L5/setup.ts 在每个 worker 内加载

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/L5/**/*.e2e.test.ts'],
    setupFiles: ['__tests__/L5/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
