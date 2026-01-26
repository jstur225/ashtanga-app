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
}

export default nextConfig
