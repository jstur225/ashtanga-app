import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { POSES } from '@/lib/pose-data'

const ROOT = path.resolve(__dirname, '..')

const publicFile = (url: string) => path.join(ROOT, 'public', url.replace(/^\//, ''))

describe('体式图片资源', () => {
  it('每个体式都使用独立的 WebP 缩略图和详情图', () => {
    for (const pose of POSES) {
      expect(pose.thumbnail).toMatch(/-thumb\.webp$/)
      expect(pose.image).toMatch(/\.webp$/)
      expect(pose.thumbnail).not.toBe(pose.image)
      expect(fs.existsSync(publicFile(pose.thumbnail))).toBe(true)
      expect(fs.existsSync(publicFile(pose.image))).toBe(true)
    }
  })

  it('缩略图和详情图保持轻量', () => {
    for (const pose of POSES) {
      expect(fs.statSync(publicFile(pose.thumbnail)).size).toBeLessThan(30 * 1024)
      expect(fs.statSync(publicFile(pose.image)).size).toBeLessThan(300 * 1024)
    }
  })
})

