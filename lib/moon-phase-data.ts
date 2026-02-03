export interface MoonDayDate {
  date: string      // 格式: "2026-01-03"
  type: 'new' | 'full'  // 新月或满月
}

export const MOON_DAYS_2026: MoonDayDate[] = [
  // 一月
  { date: "2026-01-03", type: "full" },
  { date: "2026-01-19", type: "new" },
  // 二月
  { date: "2026-02-02", type: "full" },
  { date: "2026-02-17", type: "new" },
  // 三月
  { date: "2026-03-03", type: "full" },
  { date: "2026-03-19", type: "new" },
  // 四月
  { date: "2026-04-02", type: "full" },
  { date: "2026-04-17", type: "new" },
  // 五月
  { date: "2026-05-02", type: "full" },
  { date: "2026-05-17", type: "new" },
  { date: "2026-05-31", type: "full" },
  // 六月
  { date: "2026-06-15", type: "new" },
  { date: "2026-06-30", type: "full" },
  // 七月
  { date: "2026-07-14", type: "new" },
  { date: "2026-07-29", type: "full" },
  // 八月
  { date: "2026-08-13", type: "new" },
  { date: "2026-08-28", type: "full" },
  // 九月
  { date: "2026-09-11", type: "new" },
  { date: "2026-09-27", type: "full" },
  // 十月
  { date: "2026-10-10", type: "new" },
  { date: "2026-10-26", type: "full" },
  // 十一月
  { date: "2026-11-09", type: "new" },
  { date: "2026-11-24", type: "full" },
  // 十二月
  { date: "2026-12-09", type: "new" },
  { date: "2026-12-24", type: "full" },
]
