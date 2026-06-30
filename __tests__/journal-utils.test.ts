import { describe, expect, it } from "vitest"
import fs from "fs"
import path from "path"
import { calculateMonthlyJournalStats } from "@/lib/journal-utils"
import type { PracticeRecord } from "@/hooks/usePracticeData"

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

describe("calculateMonthlyJournalStats", () => {
  it("只统计指定月份中 duration > 0 且非草稿的记录", () => {
    const stats = calculateMonthlyJournalStats(
      [
        record({ id: "a", date: "2026-06-01", duration: 1800 }),
        record({ id: "b", date: "2026-06-02", duration: 3600 }),
        record({ id: "draft", date: "2026-06-03", type: "草稿", duration: 3600 }),
        record({ id: "zero", date: "2026-06-04", duration: 0 }),
        record({ id: "other-month", date: "2026-05-31", duration: 3600 }),
      ],
      2026,
      5,
      new Date("2026-06-17T12:00:00+08:00")
    )

    expect(stats.practiceDays).toBe(2)
    expect(stats.totalMinutes).toBe(90)
    expect(stats.avgMinutes).toBe(45)
  })

  it("最近练习超过 7 天时连续周数归零", () => {
    const stats = calculateMonthlyJournalStats(
      [record({ id: "old", date: "2026-06-01", duration: 3600 })],
      2026,
      5,
      new Date("2026-06-17T12:00:00+08:00")
    )

    expect(stats.consecutiveWeeks).toBe(0)
  })

  it("连续练习日期间隔不超过 7 天时计算连续周数", () => {
    const stats = calculateMonthlyJournalStats(
      [
        record({ id: "a", date: "2026-06-17", duration: 3600 }),
        record({ id: "b", date: "2026-06-10", duration: 3600 }),
        record({ id: "c", date: "2026-06-03", duration: 3600 }),
        record({ id: "break", date: "2026-05-20", duration: 3600 }),
      ],
      2026,
      5,
      new Date("2026-06-17T12:00:00+08:00")
    )

    expect(stats.consecutiveWeeks).toBe(3)
  })
})

describe("Journal component boundaries", () => {
  it("practice/page.tsx 不再内联 MonthlyHeatmap 和 SyncButton", () => {
    const root = path.resolve(__dirname, "..")
    const pageSource = fs.readFileSync(path.join(root, "app/practice/page.tsx"), "utf8")
    const heatmapSource = fs.readFileSync(path.join(root, "components/journal/MonthlyHeatmap.tsx"), "utf8")

    expect(pageSource).not.toContain("function MonthlyHeatmap")
    expect(pageSource).not.toContain("function SyncButton")
    expect(heatmapSource).toContain("export function MonthlyHeatmap")
  })

  it("practice/page.tsx 不再内联 JournalTab", () => {
    const root = path.resolve(__dirname, "..")
    const pageSource = fs.readFileSync(path.join(root, "app/practice/page.tsx"), "utf8")
    const journalSource = fs.readFileSync(path.join(root, "components/journal/JournalTab.tsx"), "utf8")

    expect(pageSource).not.toContain("function JournalTab")
    expect(journalSource).toContain("export function JournalTab")
  })

  it("practice/page.tsx 不再内联记录新增/编辑弹窗和选择器", () => {
    const root = path.resolve(__dirname, "..")
    const pageSource = fs.readFileSync(path.join(root, "app/practice/page.tsx"), "utf8")
    const modalSource = fs.readFileSync(path.join(root, "components/practice-record/RecordModals.tsx"), "utf8")
    const pickerSource = fs.readFileSync(path.join(root, "components/practice-record/RecordPickers.tsx"), "utf8")

    expect(pageSource).not.toContain("function EditRecordModal")
    expect(pageSource).not.toContain("function AddPracticeModal")
    expect(pageSource).not.toContain("function DatePickerModal")
    expect(pageSource).not.toContain("function TypeSelectorModal")
    expect(modalSource).toContain("export function EditRecordModal")
    expect(modalSource).toContain("export function AddPracticeModal")
    expect(pickerSource).toContain("export function DatePickerModal")
    expect(pickerSource).toContain("export function TypeSelectorModal")
  })

  it("practice/page.tsx 不再内联 CompletionSheet", () => {
    const root = path.resolve(__dirname, "..")
    const pageSource = fs.readFileSync(path.join(root, "app/practice/page.tsx"), "utf8")
    const completionSource = fs.readFileSync(path.join(root, "components/practice-record/CompletionSheet.tsx"), "utf8")

    expect(pageSource).not.toContain("function CompletionSheet")
    expect(completionSource).toContain("export function CompletionSheet")
  })
})
