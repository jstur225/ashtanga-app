import { describe, expect, it } from 'vitest'
import { analyzeSync } from '@/lib/sync-orchestrator'
import type { PracticeRecord } from '@/lib/supabase'

const makeRecord = (overrides: Partial<PracticeRecord> & { id: string }): PracticeRecord => ({
  user_id: 'user-1',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  date: '2026-06-01',
  type: 'Led',
  duration: 60,
  notes: '',
  photos: [],
  ...overrides,
})

describe('analyzeSync record direction', () => {
  it('uploads when local has a new record and remote has no new records', () => {
    const shared = makeRecord({ id: 'shared' })
    const localOnly = makeRecord({ id: 'local-only', date: '2026-06-02' })

    const result = analyzeSync(
      [shared, localOnly],
      [shared],
      [],
      [],
      null,
      null,
      1000,
      'user-1',
    )

    expect(result.decision.action).toBe('upload-local')
  })

  it('downloads only remote-only records without duplicating shared ids', () => {
    const shared = makeRecord({ id: 'shared' })
    const remoteOnly = makeRecord({ id: 'remote-only', date: '2026-06-02' })

    const result = analyzeSync(
      [shared],
      [shared, remoteOnly],
      [],
      [],
      null,
      null,
      1000,
      'user-1',
    )

    expect(result.decision.action).toBe('merge-remote')
    if (result.decision.action === 'merge-remote') {
      expect(result.decision.mergedRecords.map((record) => record.id)).toEqual(['remote-only'])
      expect(result.decision.mergedCount).toBe(1)
    }
  })

  it('does nothing when both sides contain the same record ids', () => {
    const shared = makeRecord({ id: 'shared' })

    const result = analyzeSync(
      [shared],
      [shared],
      [],
      [],
      null,
      null,
      1000,
      'user-1',
    )

    expect(result.decision.action).toBe('noop')
  })
})
