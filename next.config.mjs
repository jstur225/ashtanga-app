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
  // 录屏脚本通过 127.0.0.1 访问绑定在 0.0.0.0 的开发服务器。
  allowedDevOrigins: ['127.0.0.1'],
  // 自动录屏不应包含 Next.js 左下角的开发模式标记；错误覆盖层仍会保留。
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/audio/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Accept-Ranges',
            value: 'bytes',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/seo',
        destination: '/tools/ashtanga-practice-tracker',
        permanent: true,
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 实验性功能
  experimental: {
    optimizePackageImports: ['@radix-ui', 'lucide-react', 'framer-motion'], // 优化导入
  },
  // 生产构建自动移除 console 日志
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 注入 Git 版本信息到环境变量
  env: {
    NEXT_PUBLIC_GIT_COMMIT_HASH: commitHash,
    NEXT_PUBLIC_GIT_COMMIT_DATE: commitDate,
    NEXT_PUBLIC_GIT_BRANCH: branch,
  },
}

export default nextConfig
