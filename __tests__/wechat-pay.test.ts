import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PAYMENT_PLANS,
  buildMiniProgramPaymentParams,
  createOutTradeNo,
  decryptWechatResource,
  getPaymentPlan,
  publicPaymentPlans,
  rsaVerify,
  type WechatPayConfig,
} from '@/lib/wechat-pay'

function makeConfig(): WechatPayConfig {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  return {
    appId: 'wx36f4826bc022d43f',
    appSecret: 'test-secret',
    mchId: '1748730805',
    merchantSerialNo: 'SERIAL',
    merchantPrivateKey: privateKey,
    apiV3Key: '12345678901234567890123456789012',
    wechatPayPublicKeyId: 'PUB_KEY_ID_TEST',
    wechatPayPublicKey: publicKey,
    notifyUrl: 'https://ash.ashtangalife.online/api/membership/order/notify',
  }
}

describe('wechat pay plans and signatures', () => {
  it('keeps the confirmed prices and durations on the server', () => {
    expect(PAYMENT_PLANS.quarter).toMatchObject({ amount_total: 1980, duration_days: 90 })
    expect(PAYMENT_PLANS.year).toMatchObject({ amount_total: 6980, duration_days: 365 })
    expect(publicPaymentPlans().map((plan) => plan.price)).toEqual(['19.8', '69.8'])
    expect(getPaymentPlan('quarter')?.id).toBe('quarter')
    expect(getPaymentPlan('invalid')).toBeNull()
  })

  it('creates a WeChat-safe unique merchant order number', () => {
    const first = createOutTradeNo(1_700_000_000_000)
    const second = createOutTradeNo(1_700_000_000_000)
    expect(first).toMatch(/^[A-Z0-9]{6,32}$/)
    expect(second).not.toBe(first)
  })

  it('signs mini-program payment parameters with the merchant private key', () => {
    const config = makeConfig()
    const params = buildMiniProgramPaymentParams('wx-prepay-id', config)
    const message = `${config.appId}\n${params.timeStamp}\n${params.nonceStr}\n${params.package}\n`
    const publicKey = crypto.createPublicKey(config.merchantPrivateKey).export({ type: 'spki', format: 'pem' }).toString()
    expect(params.package).toBe('prepay_id=wx-prepay-id')
    expect(params.signType).toBe('RSA')
    expect(rsaVerify(message, params.paySign, publicKey)).toBe(true)
  })

  it('decrypts AES-256-GCM payment notification resources', () => {
    const apiV3Key = '12345678901234567890123456789012'
    const nonce = '123456789012'
    const associatedData = 'transaction'
    const plaintext = JSON.stringify({ trade_state: 'SUCCESS', amount: { total: 1980 } })
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(apiV3Key), Buffer.from(nonce))
    cipher.setAAD(Buffer.from(associatedData))
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
    expect(decryptWechatResource({
      algorithm: 'AEAD_AES_256_GCM',
      ciphertext: encrypted.toString('base64'),
      nonce,
      associated_data: associatedData,
    }, apiV3Key)).toBe(plaintext)
  })

  it('keeps payment credentials out of the mini-program package', () => {
    const root = path.resolve(process.cwd(), 'weapp')
    const secretNames = [
      'WECHAT_MINI_APP_SECRET',
      'WECHAT_PAY_PRIVATE_KEY',
      'WECHAT_PAY_API_V3_KEY',
    ]
    const files: string[] = []
    const walk = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name)
        if (entry.isDirectory()) walk(absolute)
        else if (/\.(?:js|json|wxml|wxss)$/.test(entry.name)) files.push(absolute)
      }
    }
    walk(root)
    const packageText = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
    for (const secretName of secretNames) expect(packageText).not.toContain(secretName)
  })
})
