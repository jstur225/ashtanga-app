import { execSync } from 'child_process'

// 获取 Git 版本号
function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // SWC压缩已是Next.js 16默认选项
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // 生产环境移除console
  },
  // 实验性功能
  experimental: {
    optimizePackageImports: ['@radix-ui', 'lucide-react', 'framer-motion'], // 优化导入
  },
  // 环境变量 - 构建时注入
  env: {
    NEXT_PUBLIC_GIT_COMMIT: getGitCommit(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
}

export default nextConfig
