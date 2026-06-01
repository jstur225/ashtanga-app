import { describe, it, expect } from 'vitest'
import { isAnnotationDuplicate } from '@/lib/annotation-types'
import type { EnrichedAnnotation } from '@/lib/annotation-types'

const makeAnnotation = (typeId: string, date: string): EnrichedAnnotation => ({
  id: `id-${typeId}-${date}`,
  annotation_type_id: typeId,
  date,
  created_at: '2026-06-01T00:00:00Z',
  type: { label: '测试', color: '#000', id: typeId },
})

describe('isAnnotationDuplicate', () => {
  it('returns false when existing is empty', () => {
    expect(isAnnotationDuplicate([], 'type-1', '2026-06-01')).toBe(false)
  })

  it('returns true when same typeId + date already exists', () => {
    const existing = [makeAnnotation('type-1', '2026-06-01')]
    expect(isAnnotationDuplicate(existing, 'type-1', '2026-06-01')).toBe(true)
  })

  it('returns false when same typeId but different date', () => {
    const existing = [makeAnnotation('type-1', '2026-06-01')]
    expect(isAnnotationDuplicate(existing, 'type-1', '2026-06-02')).toBe(false)
  })

  it('returns false when same date but different typeId', () => {
    const existing = [makeAnnotation('type-1', '2026-06-01')]
    expect(isAnnotationDuplicate(existing, 'type-2', '2026-06-01')).toBe(false)
  })

  it('returns true when match is among multiple existing entries', () => {
    const existing = [
      makeAnnotation('type-1', '2026-05-15'),
      makeAnnotation('type-2', '2026-06-01'),
      makeAnnotation('type-1', '2026-06-02'),
    ]
    expect(isAnnotationDuplicate(existing, 'type-2', '2026-06-01')).toBe(true)
  })
})
