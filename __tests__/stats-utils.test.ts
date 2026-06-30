import { describe, expect, it } from "vitest"
import fs from "fs"
import path from "path"
import {
  buildYearMonthGroups,
  calculateCurrentMonthStats,
  calculateTotalStats,
  maskEmail,
} from "@/lib/stats-utils"
import type { PracticeOption, PracticeRecord, UserProfile } from "@/hooks/usePracticeData"

function record(overrides: Partial<PracticeRecord>): PracticeRecord {
  return {
    id: overrides.id ?? `record-${overrides.date ?? "unknown"}`,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    date: "2026-06-01",
    type: "一序列",
    duration: 3600,
    notes: "",
    photos: [],
    ...overrides,
  }
}

const profile: UserProfile = {
  id: "profile-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  name: "练习者",
  signature: "练习、练习",
  avatar: null,
}

const options: PracticeOption[] = [
  {
    id: "primary",
    created_at: "2026-01-01T00:00:00.000Z",
    label: "一序列",
    notes: "",
    is_custom: false,
    color_level: 4,
  },
  {
    id: "mysore",
    created_at: "2026-01-01T00:00:00.000Z",
    label: "Mysore",
    notes: "",
    is_custom: false,
    color_level: 2,
  },
]

describe("maskEmail", () => {
  it("脱敏正常邮箱、短用户名、非法邮箱和空字符串", () => {
    expect(maskEmail("abcdefghi@example.com")).toBe("abc****ghi@example.com")
    expect(maskEmail("abcde@example.com")).toBe("abc***@example.com")
    expect(maskEmail("not-an-email")).toBe("not-an-email")
    expect(maskEmail("")).toBe("")
  })
})

describe("calculateCurrentMonthStats", () => {
  it("只计算当前年月、非未来日期、且 duration > 0 的记录", () => {
    const result = calculateCurrentMonthStats(
      [
        record({ id: "current-1", date: "2026-06-01", duration: 1800 }),
        record({ id: "current-2", date: "2026-06-10", duration: 3600 }),
        record({ id: "zero", date: "2026-06-12", duration: 0 }),
        record({ id: "future", date: "2026-06-18", duration: 3600 }),
        record({ id: "other-month", date: "2026-05-31", duration: 3600 }),
      ],
      new Date("2026-06-17T12:00:00+08:00")
    )

    expect(result).toEqual({
      practiceDays: 2,
      totalMinutes: 90,
      avgDuration: 45,
    })
  })
})

describe("calculateTotalStats", () => {
  it("累计统计会叠加历史天数和历史平均分钟", () => {
    const result = calculateTotalStats(
      [
        record({ id: "local-1", duration: 1800 }),
        record({ id: "local-2", duration: 3600 }),
        record({ id: "zero", duration: 0 }),
      ],
      {
        ...profile,
        historical_days: 10,
        historical_avg_minutes: 45,
      }
    )

    expect(result).toEqual({
      localDays: 2,
      totalDays: 12,
      totalHours: 9,
      avgMinutes: 45,
    })
  })
})

describe("buildYearMonthGroups", () => {
  it("固定生成 12 个月，并正确处理闰年和非闰年天数", () => {
    const leapGroups = buildYearMonthGroups([], options, true, 2024)
    const normalGroups = buildYearMonthGroups([], options, true, 2026)

    expect(leapGroups).toHaveLength(12)
    expect(leapGroups.find((group) => group.monthKey === "2024-02")?.days).toHaveLength(29)
    expect(normalGroups).toHaveLength(12)
    expect(normalGroups.find((group) => group.monthKey === "2026-02")?.days).toHaveLength(28)
  })

  it("单日多条记录会合并分钟数并取最高色阶", () => {
    const groups = buildYearMonthGroups(
      [
        record({ id: "a", date: "2026-06-01", type: "一序列", duration: 1800 }),
        record({ id: "b", date: "2026-06-01", type: "Mysore", duration: 900, color_level: 2 }),
      ],
      options,
      true,
      2026
    )

    const juneFirst = groups.find((group) => group.monthKey === "2026-06")?.days.find((day) => day.date === "2026-06-01")
    expect(juneFirst).toEqual({
      date: "2026-06-01",
      count: 45,
      colorLevel: 4,
    })
  })

  it("免费用户的锁定色阶沿用 getEffectiveOptionColor 的降级结果", () => {
    const groups = buildYearMonthGroups(
      [record({ id: "free", date: "2026-06-02", type: "一序列", duration: 1800 })],
      options,
      false,
      2026
    )

    const juneSecond = groups.find((group) => group.monthKey === "2026-06")?.days.find((day) => day.date === "2026-06-02")
    expect(juneSecond?.colorLevel).toBe(3)
  })
})

describe("StatsTab component boundary", () => {
  it("practice/page.tsx 不再内联 StatsTab，组件文件导出 StatsTab", () => {
    const root = path.resolve(__dirname, "..")
    const pageSource = fs.readFileSync(path.join(root, "app/practice/page.tsx"), "utf8")
    const componentSource = fs.readFileSync(path.join(root, "components/stats/StatsTab.tsx"), "utf8")

    expect(pageSource).not.toContain("function StatsTab")
    expect(componentSource).toContain("export function StatsTab")
  })
})
