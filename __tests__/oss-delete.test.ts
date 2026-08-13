import { beforeEach, describe, expect, it, vi } from 'vitest'

function setupEnv() {
  process.env.OSS_ACCESS_KEY_ID = 'test-key-id'
  process.env.OSS_ACCESS_KEY_SECRET = 'test-key-secret'
  process.env.OSS_BUCKET = 'ashtanga-app-photos'
  process.env.OSS_ENDPOINT = 'oss-cn-shanghai.aliyuncs.com'
}

describe('lib/oss-delete', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    setupEnv()
  })

  it('extractOssKey 从规范 URL 提取 key，并拒绝其他 bucket/endpoint', async () => {
    const { extractOssKey } = await import('@/lib/oss-delete')
    expect(extractOssKey('https://ashtanga-app-photos.oss-cn-shanghai.aliyuncs.com/user-1/20260717/a.jpg'))
      .toBe('user-1/20260717/a.jpg')
    expect(extractOssKey('https://other-bucket.oss-cn-shanghai.aliyuncs.com/user-1/a.jpg')).toBeNull()
    expect(extractOssKey('https://ashtanga-app-photos.oss-cn-beijing.aliyuncs.com/user-1/a.jpg')).toBeNull()
    expect(extractOssKey('')).toBeNull()
  })

  it('deleteOssObject 发出带 OSS 签名的 DELETE，404 视为成功', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValue({ ok: true, status: 204, text: async () => '' })
    vi.stubGlobal('fetch', fetchMock)

    const { deleteOssObject } = await import('@/lib/oss-delete')
    const result = await deleteOssObject('user-1/20260717/a.jpg')

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://ashtanga-app-photos.oss-cn-shanghai.aliyuncs.com/user-1/20260717/a.jpg')
    expect(init.method).toBe('DELETE')
    expect(init.headers.Authorization).toMatch(/^OSS test-key-id:/)
    expect(init.headers.Date).toBeTruthy()

    // 404 = 对象已不存在，视为成功
    fetchMock.mockResolvedValue({ ok: false, status: 404, text: async () => '' })
    expect((await deleteOssObject('user-1/20260717/b.jpg')).ok).toBe(true)

    // 5xx = 失败
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'ServerError' })
    const failed = await deleteOssObject('user-1/20260717/c.jpg')
    expect(failed.ok).toBe(false)
    expect(failed.status).toBe(500)
  })

  it('deleteOssObjectByUrl 校验归属：key 前缀不匹配用户则拒绝且不请求', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { deleteOssObjectByUrl } = await import('@/lib/oss-delete')
    const mismatched = await deleteOssObjectByUrl(
      'https://ashtanga-app-photos.oss-cn-shanghai.aliyuncs.com/other-user/20260717/a.jpg',
      'user-1'
    )
    expect(mismatched.ok).toBe(false)
    expect(mismatched.error).toBe('OSS_OWNERSHIP_MISMATCH')
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockResolvedValue({ ok: true, status: 204, text: async () => '' })
    const matched = await deleteOssObjectByUrl(
      'https://ashtanga-app-photos.oss-cn-shanghai.aliyuncs.com/user-1/20260717/a.jpg',
      'user-1'
    )
    expect(matched.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})