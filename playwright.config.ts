import { defineConfig, devices } from '@playwright/test'

/**
 * L4 隔离浏览器测试配置
 */
export default defineConfig({
  testDir: '__tests__/L4',
  globalSetup: './__tests__/L4/auth.setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:3100',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    // 登录态预热：跑一次，保存 storageState
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // 访客模式（不依赖登录态）
    {
      name: 'guest-chromium',
      testIgnore: /auth\.setup\.ts|journal\.spec\.ts|settings\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // 登录模式（日记、设置等）
    {
      name: 'auth-chromium',
      testMatch: /journal\.spec\.ts|settings\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },

    // 移动端视口
    {
      name: 'mobile-iphone-se',
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices['iPhone SE'],
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
