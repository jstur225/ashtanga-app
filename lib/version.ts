// Git 版本信息工具
// 在 next.config.mjs 中注入的环境变量

export interface VersionInfo {
  commitHash: string
  commitDate: string
  branch: string
  buildTime: string
}

export function getVersionInfo(): VersionInfo {
  return {
    commitHash: process.env.NEXT_PUBLIC_GIT_COMMIT_HASH || 'unknown',
    commitDate: process.env.NEXT_PUBLIC_GIT_COMMIT_DATE || 'unknown',
    branch: process.env.NEXT_PUBLIC_GIT_BRANCH || 'unknown',
    buildTime: new Date().toISOString(),
  }
}

export function formatVersionInfo(info: VersionInfo): string {
  return `
版本信息:
- 分支: ${info.branch}
- Commit: ${info.commitHash}
- 提交时间: ${info.commitDate}
- 构建时间: ${info.buildTime}
  `.trim()
}

// 用于调试日志的简短版本字符串
export function getVersionString(): string {
  const info = getVersionInfo()
  return `${info.branch}@${info.commitHash}`
}
