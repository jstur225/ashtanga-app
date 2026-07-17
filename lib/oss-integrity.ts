export type OssObjectVerification = {
  valid: boolean
  actualSize: number | null
  reason?: 'INVALID_EXPECTED_SIZE' | 'HEAD_REQUEST_FAILED' | 'INVALID_CONTENT_LENGTH' | 'SIZE_MISMATCH'
  status?: number
}

type HeadFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Pick<Response, 'ok' | 'status' | 'headers'>>

/**
 * Verify that OSS persisted the complete object instead of merely accepting the PUT.
 * Aliyun OSS returns 200 for a valid zero-byte PUT, so response.ok alone is insufficient.
 */
export async function verifyOssObjectSize(
  ossUrl: string,
  expectedSize: number,
  fetcher: HeadFetcher = fetch
): Promise<OssObjectVerification> {
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) {
    return { valid: false, actualSize: null, reason: 'INVALID_EXPECTED_SIZE' }
  }

  try {
    const response = await fetcher(ossUrl, {
      method: 'HEAD',
      cache: 'no-store',
    })

    if (!response.ok) {
      return {
        valid: false,
        actualSize: null,
        reason: 'HEAD_REQUEST_FAILED',
        status: response.status,
      }
    }

    const rawContentLength = response.headers.get('content-length')
    const actualSize = rawContentLength === null ? NaN : Number(rawContentLength)
    if (!Number.isSafeInteger(actualSize) || actualSize < 0) {
      return { valid: false, actualSize: null, reason: 'INVALID_CONTENT_LENGTH' }
    }

    if (actualSize === 0 || actualSize !== expectedSize) {
      return { valid: false, actualSize, reason: 'SIZE_MISMATCH' }
    }

    return { valid: true, actualSize }
  } catch {
    return { valid: false, actualSize: null, reason: 'HEAD_REQUEST_FAILED' }
  }
}

export function isOwnedOssObjectUrl(params: {
  ossUrl: unknown
  ossKey: unknown
  userId: string
  bucket: string
  endpoint: string
}): boolean {
  const { ossUrl, ossKey, userId, bucket, endpoint } = params
  if (
    typeof ossUrl !== 'string' ||
    typeof ossKey !== 'string' ||
    !userId ||
    !bucket ||
    !endpoint ||
    !ossKey.startsWith(`${userId}/`)
  ) {
    return false
  }

  try {
    const url = new URL(ossUrl)
    const endpointHost = endpoint.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
    const expectedHost = `${bucket}.${endpointHost}`.toLowerCase()
    const objectKeyFromUrl = decodeURIComponent(url.pathname.replace(/^\/+/, ''))

    return (
      url.protocol === 'https:' &&
      url.hostname.toLowerCase() === expectedHost &&
      url.port === '' &&
      url.username === '' &&
      url.password === '' &&
      objectKeyFromUrl === ossKey
    )
  } catch {
    return false
  }
}
