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
    expect(register).toContain('service_worker_registered')
    expect(register).toContain('service_worker_registration_failed')
  })

  it('captures startup and resource failures before hydration', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf-8')
    const diagnostics = fs.readFileSync(
      path.join(ROOT, 'components/RuntimeDiagnosticsScript.tsx'),
      'utf-8'
    )
    const ready = fs.readFileSync(
      path.join(ROOT, 'components/RuntimeDiagnosticsReady.tsx'),
      'utf-8'
    )

    expect(layout).toContain('<RuntimeDiagnosticsScript />')
    expect(diagnostics).toContain('strategy="beforeInteractive"')
    expect(diagnostics).toContain("'resource_error'")
    expect(diagnostics).toContain("'runtime_error'")
    expect(diagnostics).toContain("'unhandled_rejection'")
    expect(diagnostics).toContain("'previous_session_incomplete'")
    expect(ready).toContain('__ashtangaRuntimeReady')
  })
})
