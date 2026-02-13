// Git 版本信息 - 用于确认用户使用的代码版本
// 这个文件在构建时自动更新

export const GIT_VERSION = process.env.NEXT_PUBLIC_GIT_COMMIT || 'unknown'
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString()

// 完整的版本信息对象
export const getVersionInfo = () => ({
  gitCommit: GIT_VERSION,
  buildTime: BUILD_TIME,
  environment: process.env.NODE_ENV,
  shortCommit: GIT_VERSION.slice(0, 8)
})
