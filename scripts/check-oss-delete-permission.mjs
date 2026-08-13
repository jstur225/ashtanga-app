/**
 * 检查 OSS AccessKey 是否具备 oss:DeleteObject 权限（安全版）。
 *
 * 原理：对【一个不存在的对象】发签名 DELETE——
 *   - 返回 404 NoSuchKey  = 有删除权限（对象不存在而已）
 *   - 返回 403 AccessDenied = 没有删除权限
 * 不会删除任何真实文件。
 *
 * 用法（在能拿到 AccessKey 的环境）：
 *   $env:OSS_ACCESS_KEY_ID='...'
 *   $env:OSS_ACCESS_KEY_SECRET='...'
 *   $env:OSS_BUCKET='ashtanga-app-photos'
 *   $env:OSS_ENDPOINT='oss-cn-shanghai.aliyuncs.com'
 *   node scripts/check-oss-delete-permission.mjs
 */
import crypto from 'node:crypto'

const id = process.env.OSS_ACCESS_KEY_ID || ''
const secret = process.env.OSS_ACCESS_KEY_SECRET || ''
const bucket = process.env.OSS_BUCKET || ''
const endpoint = process.env.OSS_ENDPOINT || ''

if (!id || !secret || !bucket || !endpoint) {
  console.error('缺少 OSS 环境变量：OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET / OSS_ENDPOINT')
  process.exit(1)
}

const key = `permission-check-${Date.now()}.jpg`
const date = new Date().toUTCString()
const stringToSign = `DELETE\n\n\n${date}\n/${bucket}/${key}`
const signature = crypto.createHmac('sha1', secret).update(stringToSign).digest('base64')
const cleanEndpoint = endpoint.replace(/^https?:\/\//, '')
const url = `https://${bucket}.${cleanEndpoint}/${key}`

console.log('正在对不存在的对象发送 DELETE 校验权限…')
const res = await fetch(url, {
  method: 'DELETE',
  headers: { Date: date, Authorization: `OSS ${id}:${signature}` }
})

if (res.status === 404) {
  console.log('✅ 有 oss:DeleteObject 权限（返回 404，说明请求通过了鉴权，只是对象不存在）')
} else if (res.status === 403) {
  console.log('❌ 没有 oss:DeleteObject 权限（403 AccessDenied）')
  console.log('   处理：登录阿里云控制台 → RAM 访问控制 → 找到该 AccessKey 所属用户 → 权限管理，')
  console.log('   给它加上含 oss:DeleteObject 的策略（如 AliyunOSSFullAccess 或自定义策略）。')
} else {
  console.log(`未知状态 ${res.status}`)
  console.log(await res.text().catch(() => ''))
}