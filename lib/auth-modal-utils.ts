export type AuthMode = 'login' | 'register' | 'forgot-password'
export type ForgotPasswordStep = 'email' | 'verify' | 'new-password'
export type RegisterStep = 'form' | 'verify'

export const AUTH_NETWORK_ERROR_MESSAGE = '网络连接失败，登录请求未能连接服务器。请检查网络后点击“重新尝试登录”。'

export function isAuthNetworkError(message: string | undefined): boolean {
  if (!message) return false

  return [
    'AuthRetryableFetchError',
    'Failed to fetch',
    'Load failed',
    'Network request failed',
    'NetworkError',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'The network connection was lost',
  ].some((pattern) => message.toLowerCase().includes(pattern.toLowerCase()))
}

export function translateAuthError(message: string | undefined): string {
  if (!message) return '操作失败，请重试'

  if (isAuthNetworkError(message)) return AUTH_NETWORK_ERROR_MESSAGE

  const errorMap: Record<string, string> = {
    'New password should be different from the old password.': '新密码不能与原密码相同',
    'Invalid login credentials': '邮箱或密码错误',
    'Email not confirmed': '邮箱未验证',
    'User already registered': '该邮箱已注册，请直接登录',
    'Password should be at least 6 characters': '密码至少需要6个字符',
    'Unable to validate email address: invalid format': '邮箱格式不正确',
    'Signups not allowed': '暂不允许注册',
    'Email rate limit exceeded': '发送邮件过于频繁，请稍后再试',
    'User not found': '用户不存在',
    'Gateway Timeout': '服务器响应超时，可能正在发送确认邮件，请稍后尝试登录',
    '504': '服务器响应超时，可能正在发送确认邮件，请稍后尝试登录',
    '注册请求超时': '注册请求超时，可能正在发送确认邮件，请稍后尝试登录',
  }

  for (const [english, chinese] of Object.entries(errorMap)) {
    if (message.includes(english)) return chinese
  }

  return message
}

export function validateAuthPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) return { valid: false, error: '密码至少需要8位字符' }
  if (!/[a-zA-Z]/.test(password)) return { valid: false, error: '密码必须包含字母' }
  if (!/\d/.test(password)) return { valid: false, error: '密码必须包含数字' }

  const weakPasswords = ['12345678', 'password', 'qwerty123', 'abc12345', '11111111']
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: '密码过于简单，请使用更强的密码' }
  }

  return { valid: true }
}

export async function postAuthJson<T = any>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || '操作失败')
  }
  return data
}

export async function sendAuthVerificationCode(email: string, type?: 'email_verification' | 'reset_password') {
  return postAuthJson('/api/auth/send-verification-code', type ? { email, type } : { email })
}
