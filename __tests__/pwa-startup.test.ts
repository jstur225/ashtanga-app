import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')

describe('PWA startup reliability', () => {
  it('starts installed app directly on the practice route', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/manifest.json'), 'utf-8')
    )

    expect(manifest.start_url).toBe('/practice')
    expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual([
      '/practice',
      '/practice?tab=journal',
    ])
  })

  it('service worker does not cache navigation HTML', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf-8')

    expect(sw).not.toContain('Date.now()')
    expect(sw).not.toMatch(/cache\.put\(event\.request/)
    expect(sw).toContain("request.mode === 'navigate'")
    expect(sw).toContain('event.respondWith(fetch(request))')
  })

  it('service worker registration bypasses HTTP cache when checking sw.js', () => {
    const register = fs.readFileSync(
      path.join(ROOT, 'components/ServiceWorkerRegister.tsx'),
      'utf-8'
    )

    expect(register).toContain("updateViaCache: 'none'")
    expect(register).toContain('registration.update()')
  })
})
