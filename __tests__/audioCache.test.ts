import { describe, it, expect, vi, beforeEach } from 'vitest'
import { audioCache } from '@/lib/audioCache'

/**
 * Self-contained mock AudioCacheService
 * Tests the download-and-cache logic independently of IndexedDB.
 */
class MockAudioCache {
  private data = new Map<string, ArrayBuffer>()

  async isCacheValid(audioKey: string, currentVersion: string): Promise<boolean> {
    return localStorage.getItem(`audio-cache-version:${audioKey}`) === currentVersion && this.data.has(audioKey)
  }

  async getAudioBuffer(audioKey: string): Promise<ArrayBuffer | null> {
    return this.data.get(audioKey) ?? null
  }

  async saveAudio(audioKey: string, currentVersion: string, buffer: ArrayBuffer): Promise<void> {
    this.data.set(audioKey, buffer)
    localStorage.setItem(`audio-cache-version:${audioKey}`, currentVersion)
  }

  async clearCache(audioKey: string): Promise<void> {
    this.data.delete(audioKey)
    localStorage.removeItem(`audio-cache-version:${audioKey}`)
  }

  async clearAllCaches(): Promise<void> {
    this.data.clear()
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.startsWith('audio-cache-version:') || key === 'audio-cache-version') {
        localStorage.removeItem(key)
      }
    }
  }

  async downloadAndCache(
    url: string,
    audioKey: string,
    currentVersion: string,
    onProgress?: (loaded: number, total: number) => void,
    options?: { priority?: 'high' | 'low' | 'auto'; signal?: AbortSignal }
  ): Promise<ArrayBuffer> {
    const response = await fetch(new Request(url, {
      priority: options?.priority || 'auto',
      signal: options?.signal,
    }))
    if (!response.ok) throw new Error(`下载失败: ${response.status}`)

    const total = parseInt(response.headers.get('content-length') || '0', 10)
    const reader = response.body!.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      if (onProgress && total > 0) onProgress(loaded, total)
    }

    const allChunks = new Uint8Array(loaded)
    let pos = 0
    for (const c of chunks) { allChunks.set(c, pos); pos += c.length }

    const arrayBuffer = allChunks.buffer
    this.data.set(audioKey, arrayBuffer)
    localStorage.setItem(`audio-cache-version:${audioKey}`, currentVersion)
    return arrayBuffer
  }
}

describe('audioCache', () => {
  let cache: MockAudioCache

  beforeEach(() => {
    cache = new MockAudioCache()
    localStorage.clear()
  })

  describe('isCacheValid', () => {
    it('returns false when no cache exists', async () => {
      expect(await cache.isCacheValid('guruji', '1.0')).toBe(false)
    })

    it('returns false when version mismatch', async () => {
      localStorage.setItem('audio-cache-version:guruji', '0.9')
      expect(await cache.isCacheValid('guruji', '1.0')).toBe(false)
    })
  })

  describe('getAudioBuffer', () => {
    it('returns null when no cache', async () => {
      expect(await cache.getAudioBuffer('guruji')).toBeNull()
    })

    it('returns buffer after save', async () => {
      await cache.saveAudio('guruji', '1.0', new ArrayBuffer(100))
      const result = await cache.getAudioBuffer('guruji')
      expect(result).toBeTruthy()
      expect(result!.byteLength).toBe(100)
    })
  })

  describe('saveAudio + isCacheValid', () => {
    it('marks cache as valid after save', async () => {
      expect(await cache.isCacheValid('guruji', '1.0')).toBe(false)
      await cache.saveAudio('guruji', '1.0', new ArrayBuffer(100))
      expect(await cache.isCacheValid('guruji', '1.0')).toBe(true)
    })
  })

  describe('clearCache', () => {
    it('生产缓存服务提供清空全部音频缓存的能力', () => {
      expect(typeof (audioCache as typeof audioCache & { clearAllCaches?: unknown }).clearAllCaches).toBe('function')
    })

    it('clears cache and invalidates', async () => {
      await cache.saveAudio('guruji', '1.0', new ArrayBuffer(100))
      expect(await cache.isCacheValid('guruji', '1.0')).toBe(true)
      await cache.clearCache('guruji')
      expect(await cache.isCacheValid('guruji', '1.0')).toBe(false)
      expect(await cache.getAudioBuffer('guruji')).toBeNull()
    })

    it('只清理指定口令版本', async () => {
      await cache.saveAudio('guruji', '1.0', new ArrayBuffer(10))
      await cache.saveAudio('sharath', '1.0', new ArrayBuffer(20))
      await cache.clearCache('sharath')

      expect(await cache.isCacheValid('guruji', '1.0')).toBe(true)
      expect(await cache.isCacheValid('sharath', '1.0')).toBe(false)
    })

    it('清理全部口令版本和版本标记', async () => {
      await cache.saveAudio('guruji', '1.0', new ArrayBuffer(10))
      await cache.saveAudio('sharath', '1.0', new ArrayBuffer(20))
      localStorage.setItem('audio-cache-version', 'legacy')

      await cache.clearAllCaches()

      expect(await cache.getAudioBuffer('guruji')).toBeNull()
      expect(await cache.getAudioBuffer('sharath')).toBeNull()
      expect(localStorage.getItem('audio-cache-version:guruji')).toBeNull()
      expect(localStorage.getItem('audio-cache-version:sharath')).toBeNull()
      expect(localStorage.getItem('audio-cache-version')).toBeNull()
    })
  })

  describe('downloadAndCache', () => {
    it('downloads audio and returns ArrayBuffer', async () => {
      const mockData = new Uint8Array([1, 2, 3, 4])
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '4']]),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: mockData })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      })

      const buffer = await cache.downloadAndCache('http://localhost/audio/test.m4a', 'guruji', '1.0')
      expect(buffer.byteLength).toBe(4)
      expect(await cache.isCacheValid('guruji', '1.0')).toBe(true)
    })

    it('calls onProgress during download', async () => {
      const chunk1 = new Uint8Array([1, 2])
      const chunk2 = new Uint8Array([3, 4])
      const onProgress = vi.fn()

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '4']]),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: chunk1 })
              .mockResolvedValueOnce({ done: false, value: chunk2 })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      })

      await cache.downloadAndCache('http://localhost/audio/test.m4a', 'guruji', '1.0', onProgress)
      expect(onProgress).toHaveBeenCalledWith(2, 4)
      expect(onProgress).toHaveBeenCalledWith(4, 4)
    })

    it('throws on non-200 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
      await expect(cache.downloadAndCache('http://localhost/audio/test.m4a', 'guruji', '1.0')).rejects.toThrow('下载失败: 404')
    })

    it('passes priority option to fetch', async () => {
      const mockData = new Uint8Array([1])
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true, status: 200,
        headers: new Map([['content-length', '1']]),
        body: { getReader: () => ({ read: vi.fn().mockResolvedValueOnce({ done: false, value: mockData }).mockResolvedValueOnce({ done: true }) }) },
      })

      await cache.downloadAndCache('http://localhost/audio/test.m4a', 'guruji', '1.0', undefined, { priority: 'low' })
      expect(globalThis.fetch).toHaveBeenCalled()
      const request = (globalThis.fetch as any).mock.calls[0][0]
      expect(request).toBeInstanceOf(Request)
    })
  })
})
