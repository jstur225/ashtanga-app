import { execSync } from 'child_process'

// 获取 Git 版本信息
function getGitVersion() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim()
    const commitDate = execSync('git log -1 --format=%cd --date=iso').toString().trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    return { commitHash, commitDate, branch }
  } catch (e) {
    return { commitHash: 'unknown', commitDate: 'unknown', branch: 'unknown' }
  }
}

const { commitHash, commitDate, branch } = getGitVersion()

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
  // 注入 Git 版本信息到环境变量
  env: {
    NEXT_PUBLIC_GIT_COMMIT_HASH: commitHash,
    NEXT_PUBLIC_GIT_COMMIT_DATE: commitDate,
    NEXT_PUBLIC_GIT_BRANCH: branch,
  },
}

export default nextConfig
