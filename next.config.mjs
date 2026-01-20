/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 构建优化
  swcMinify: true, // 使用SWC压缩，更快
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // 生产环境移除console
  },
  // 实验性功能
  experimental: {
    optimizePackageImports: ['@radix-ui', 'lucide-react', 'framer-motion'], // 优化导入
  },
  // 禁用 standalone 模式，回归标准构建以解决静态资源 404 问题
  // output: 'standalone',
}

export default nextConfig
