import { describe, it, expect, beforeEach } from 'vitest'
import {
  addPhotoLog,
  getPhotoLogs,
  clearPhotoLogs,
  getRecentPhotoLogs,
  getPhotoLogsByRecord,
  getPhotoErrorLogs,
} from '@/lib/photo-logger'

describe('photo-logger', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('addPhotoLog / getPhotoLogs', () => {
    it('adds a log entry and retrieves it', () => {
      addPhotoLog({
        action: 'upload_success',
        fileName: 'test.jpg',
        fileSize: 1024,
        duration: 150,
      })

      const logs = getPhotoLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe('upload_success')
      expect(logs[0].fileName).toBe('test.jpg')
      expect(logs[0].fileSize).toBe(1024)
      expect(logs[0].duration).toBe(150)
    })

    it('adds multiple entries in reverse chronological order (newest first)', () => {
      addPhotoLog({ action: 'upload_success', fileName: 'a.jpg' })
      addPhotoLog({ action: 'upload_success', fileName: 'b.jpg' })

      const logs = getPhotoLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].fileName).toBe('b.jpg')
      expect(logs[1].fileName).toBe('a.jpg')
    })

    it('enforces MAX_LOG_ENTRIES = 100', () => {
      for (let i = 0; i < 110; i++) {
        addPhotoLog({ action: 'upload_success', fileName: `${i}.jpg` })
      }

      const logs = getPhotoLogs()
      expect(logs).toHaveLength(100)
    })

    it('generates id and timestamp automatically', () => {
      addPhotoLog({ action: 'upload_start' })

      const logs = getPhotoLogs()
      expect(logs[0].id).toBeTruthy()
      expect(logs[0].id).toMatch(/^\d+-/)
      expect(logs[0].timestamp).toBeTruthy()
      expect(() => new Date(logs[0].timestamp)).not.toThrow()
    })

    it('handles localStorage error gracefully', () => {
      // Simulate localStorage error by spying on setItem
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = () => { throw new Error('storage full') }

      expect(() => {
        addPhotoLog({ action: 'upload_success' })
      }).not.toThrow()

      Storage.prototype.setItem = originalSetItem
    })
  })

  describe('clearPhotoLogs', () => {
    it('clears all logs', () => {
      addPhotoLog({ action: 'upload_success' })
      addPhotoLog({ action: 'delete_success' })

      clearPhotoLogs()
      expect(getPhotoLogs()).toHaveLength(0)
    })
  })

  describe('getRecentPhotoLogs', () => {
    it('returns specified number of recent logs', () => {
      for (let i = 0; i < 10; i++) {
        addPhotoLog({ action: 'upload_success', fileName: `${i}.jpg` })
      }

      const recent = getRecentPhotoLogs(3)
      expect(recent).toHaveLength(3)
    })

    it('defaults to 20', () => {
      for (let i = 0; i < 30; i++) {
        addPhotoLog({ action: 'upload_success' })
      }

      expect(getRecentPhotoLogs()).toHaveLength(20)
    })

    it('returns all when fewer than count', () => {
      addPhotoLog({ action: 'upload_success' })
      expect(getRecentPhotoLogs(10)).toHaveLength(1)
    })
  })

  describe('getPhotoLogsByRecord', () => {
    it('filters logs by recordId', () => {
      addPhotoLog({ action: 'upload_start', recordId: 'rec-1' })
      addPhotoLog({ action: 'upload_success', recordId: 'rec-1', photoId: 'p-1' })
      addPhotoLog({ action: 'upload_success', recordId: 'rec-2' })

      const rec1Logs = getPhotoLogsByRecord('rec-1')
      expect(rec1Logs).toHaveLength(2)
      expect(rec1Logs[0].action).toBe('upload_success')
      expect(rec1Logs[1].action).toBe('upload_start')
    })

    it('returns empty array for unknown record', () => {
      expect(getPhotoLogsByRecord('unknown')).toHaveLength(0)
    })
  })

  describe('getPhotoErrorLogs', () => {
    it('filters logs with error actions', () => {
      addPhotoLog({ action: 'upload_success' })
      addPhotoLog({ action: 'upload_error', error: 'NETWORK_ERROR', errorCode: 'NETWORK_ERROR' })
      addPhotoLog({ action: 'delete_error', error: 'PHOTO_NOT_FOUND' })
      addPhotoLog({ action: 'delete_success' })

      // Logs are newest-first: delete_error (index 0) then upload_error (index 1)
      const errorLogs = getPhotoErrorLogs()
      expect(errorLogs).toHaveLength(2)
      expect(errorLogs[0].action).toBe('delete_error')
      expect(errorLogs[1].action).toBe('upload_error')
    })

    it('returns empty array when no errors', () => {
      addPhotoLog({ action: 'upload_success' })
      expect(getPhotoErrorLogs()).toHaveLength(0)
    })
  })
})
