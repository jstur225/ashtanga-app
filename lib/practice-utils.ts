export function getLocalDateStr(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatMinutes(seconds: number): string {
  return `${Math.floor(seconds / 60)}`
}

export function formatSeconds(seconds: number): string {
  return `${seconds % 60}`.padStart(2, '0')
}

export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)} 分钟`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function cleanHtml(text: string): string {
  if (!text) return ''

  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
