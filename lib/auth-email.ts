export function normalizeAuthEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
