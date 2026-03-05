/**
 * 时间工具函数
 * 用于处理练习时间的计算和格式化
 */

/**
 * 计算结束时间
 * @param startTime 开始时间，格式 "HH:MM"
 * @param durationMinutes 练习时长（分钟）
 * @returns 结束时间，格式 "HH:MM"
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
  const endHours = endDate.getHours().toString().padStart(2, '0')
  const endMinutes = endDate.getMinutes().toString().padStart(2, '0')

  return `${endHours}:${endMinutes}`
}

/**
 * 格式化练习时间段
 * @param startTime 开始时间，格式 "HH:MM"
 * @param durationMinutes 练习时长（分钟）
 * @returns 时间段字符串，如 "06:00-08:00"
 */
export function formatTimeRange(startTime: string | undefined | null, durationMinutes: number): string {
  if (!startTime) {
    // 没有开始时间，只显示时长
    return formatDuration(durationMinutes)
  }

  const endTime = calculateEndTime(startTime, durationMinutes)
  return `${startTime}-${endTime}`
}

/**
 * 格式化时长
 * @param minutes 分钟数
 * @returns 格式化字符串，如 "2小时"、"90分钟"、"1小时30分钟"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}小时`
  }

  return `${hours}小时${remainingMinutes}分钟`
}

/**
 * 解析时间字符串为分钟数（用于计算）
 * @param time 时间字符串，格式 "HH:MM"
 * @returns 从0点开始的分钟数
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
