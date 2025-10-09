/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  // 在静态导出模式下，需要明确设置环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8084',
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY || 'comic',
  },
  // 禁用严格模式以避免静态导出问题
  reactStrictMode: false,
  // 为动态路由配置跳过静态生成
  skipTrailingSlashRedirect: true,
  generateBuildId: () => 'build',
}

module.exports = nextConfig