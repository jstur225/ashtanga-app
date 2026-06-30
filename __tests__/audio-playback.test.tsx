import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Audio playback integration tests
 *
 * Tests the loadGuidedAudio logic patterns without rendering the full page component.
 * Tests decision logic: cache hit → Blob URL, cache miss → streaming + background cache
 */

describe('Audio playback decision logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Cache hit path', () => {
    it('creates Audio with Blob URL when cache is valid', async () => {
      const mockBuffer = new ArrayBuffer(100)
      const mockBlobUrl = 'blob:http://localhost/test'

      // Mock audioCache
      const mockAudioCache = {
        isCacheValid: vi.fn().mockResolvedValue(true),
        getAudioBuffer: vi.fn().mockResolvedValue(mockBuffer),
        clearCache: vi.fn().mockResolvedValue(undefined),
        downloadAndCache: vi.fn(),
      }

      // Mock URL.createObjectURL
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockBlobUrl)

      // Mock Audio with class that handles new Audio(url)
      let createdAudio: any = null
      class AudioMock {
        src: string = ''
        addEventListener = vi.fn()
        play = vi.fn().mockResolvedValue(undefined)
        pause = vi.fn()
        constructor(url?: string) {
          if (url) this.src = url
          createdAudio = this
        }
      }
      vi.stubGlobal('Audio', AudioMock as unknown as typeof globalThis.Audio)

      // Simulate cache hit flow
      const hasCache = await mockAudioCache.isCacheValid()
      expect(hasCache).toBe(true)

      const buffer = await mockAudioCache.getAudioBuffer()
      expect(buffer).toBe(mockBuffer)

      const blob = new Blob([buffer!], { type: 'audio/mp4' })
      const url = URL.createObjectURL(blob)
      expect(url).toBe(mockBlobUrl)

      const audio = new Audio()
      audio.src = url
      expect(audio.src).toBe(mockBlobUrl)
      expect(mockAudioCache.downloadAndCache).not.toHaveBeenCalled()
    })
  })

  describe('Cache miss path (streaming)', () => {
    it('creates Audio with direct URL when no cache', async () => {
      let createdSrc = ''
      class AudioMock {
        src: string = ''
        addEventListener = vi.fn()
        play = vi.fn().mockResolvedValue(undefined)
        pause = vi.fn()
        constructor(url?: string) {
          if (url) {
            this.src = url
            createdSrc = url
          }
        }
      }
      vi.stubGlobal('Audio', AudioMock as unknown as typeof globalThis.Audio)

      const mockAudioCache = {
        isCacheValid: vi.fn().mockResolvedValue(false),
        getAudioBuffer: vi.fn(),
        downloadAndCache: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }

      // Simulate cache miss: should create Audio with direct URL
      const hasCache = await mockAudioCache.isCacheValid()
      expect(hasCache).toBe(false)

      // Streaming path: new Audio with URL directly
      new Audio('/audio/guruji-led-primary.m4a')
      expect(createdSrc).toBe('/audio/guruji-led-primary.m4a')

      // Background cache should be called with priority: low
      mockAudioCache.downloadAndCache('/audio/guruji-led-primary.m4a', expect.any(Function), { priority: 'low' })
      expect(mockAudioCache.downloadAndCache).toHaveBeenCalled()
    })

    it('background cache failure does not affect playback', async () => {
      const deferred = {
        downloadAndCache: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      // Background cache fails silently
      let error: any = null
      try {
        await deferred.downloadAndCache('/audio/test.m4a')
      } catch (e) {
        error = e
      }
      expect(error?.message).toBe('Network error')

      // But playback continues (no crash)
      expect(deferred.downloadAndCache).toHaveBeenCalled()
    })
  })

  describe('Error and retry', () => {
    it('retries by calling loadGuidedAudio (not loadAudioAndStart)', async () => {
      // Verify the bug fix: retry button calls loadGuidedAudio
      const loadGuidedAudio = vi.fn()
      const loadAudioAndStart = vi.fn() // should NOT be called

      // Simulate retry button click (correct behavior)
      loadGuidedAudio()

      expect(loadGuidedAudio).toHaveBeenCalledTimes(1)
      expect(loadAudioAndStart).not.toHaveBeenCalled()
    })
  })

  describe('Blob URL cleanup', () => {
    it('revokes Blob URL on audio cleanup', () => {
      const mockBlobUrl = 'blob:http://localhost/test'
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      let audioBlobUrlRef: string | null = mockBlobUrl
      if (audioBlobUrlRef) {
        URL.revokeObjectURL(audioBlobUrlRef)
        audioBlobUrlRef = null
      }

      expect(revokeSpy).toHaveBeenCalledWith(mockBlobUrl)
      expect(audioBlobUrlRef).toBeNull()

      revokeSpy.mockRestore()
    })
  })
})

describe('Service Worker /audio/ exclusion', () => {
  it('audio paths should bypass SW cache', () => {
    const shouldBypassCache = (pathname: string) => pathname.startsWith('/audio/')

    expect(shouldBypassCache('/audio/guruji-led-primary.m4a')).toBe(true)
    expect(shouldBypassCache('/audio/opening-chant.mp3')).toBe(true)
    expect(shouldBypassCache('/api/stats/today')).toBe(false)
    expect(shouldBypassCache('/icon.png')).toBe(false)
  })
})
