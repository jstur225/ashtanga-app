import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const analyticsSource = fs.readFileSync(path.resolve(__dirname, "../lib/analytics.ts"), "utf8")

describe("分析 SDK 按需加载", () => {
  it("不在模块顶层静态导入 Mixpanel", () => {
    expect(analyticsSource).not.toMatch(/import\s+mixpanel\s+from\s+["']mixpanel-browser["']/)
    expect(analyticsSource).toContain("import('mixpanel-browser')")
  })

  it("复用单个加载任务并推迟到浏览器空闲时段", () => {
    expect(analyticsSource).toContain("if (!analyticsPromise)")
    expect(analyticsSource).toContain("requestIdleCallback")
    expect(analyticsSource).toContain("globalThis.setTimeout(load, 1500)")
  })

  it("SDK 加载失败不会阻断应用", () => {
    expect(analyticsSource).toContain("resolve(null)")
    expect(analyticsSource).toContain("Mixpanel load failed")
  })
})
