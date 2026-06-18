import { describe, expect, it } from "vitest"
import { cleanHtml, formatDate, formatDuration, formatMinutes, formatSeconds, getLocalDateStr } from "@/lib/practice-utils"

describe("practice-utils", () => {
  it("按本地时区生成日期，包含跨月边界", () => {
    expect(getLocalDateStr(new Date(2026, 0, 31, 23, 59))).toBe("2026-01-31")
    expect(getLocalDateStr(new Date(2026, 1, 1, 0, 1))).toBe("2026-02-01")
  })

  it.each([
    [0, "0", "00", "0 分钟"],
    [59, "0", "59", "0 分钟"],
    [60, "1", "00", "1 分钟"],
    [65, "1", "05", "1 分钟"],
    [36_000, "600", "00", "600 分钟"],
  ])("格式化 %i 秒", (seconds, minutes, remainder, duration) => {
    expect(formatMinutes(seconds)).toBe(minutes)
    expect(formatSeconds(seconds)).toBe(remainder)
    expect(formatDuration(seconds)).toBe(duration)
  })

  it("格式化本地日期", () => {
    expect(formatDate("2026-06-18T12:00:00")).toBe("6/18")
  })

  it("清理标签、实体和多余空行", () => {
    expect(cleanHtml(' <p>练习&nbsp;&amp;&nbsp;&quot;呼吸&quot;</p>\n\n\n\n&lt;完成&gt; '))
      .toBe('练习 & "呼吸"\n\n<完成>')
    expect(cleanHtml("")).toBe("")
  })
})
