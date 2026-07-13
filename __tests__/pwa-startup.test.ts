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

  it('falls back to a coherent cached app shell when navigation stalls', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf-8')

    expect(sw).not.toMatch(/CACHE_NAME\s*=.*Date\.now\(\)/)
    expect(sw).toContain("request.mode === 'navigate'")
    expect(sw).toContain('networkFirstNavigation(request, event.clientId)')
    expect(sw).toContain('NAVIGATION_TIMEOUT_MS = 4000')
    expect(sw).toContain("url.pathname.startsWith('/_next/static/')")
    expect(sw).toContain("cache.match(request, { ignoreSearch: true })")
    expect(sw).toContain("'navigation_cache_fallback'")
    expect(sw).toContain("'navigation_network_success'")
    expect(sw).toContain("'next_static_cache_hit'")
    expect(sw).toContain("'next_static_network_failed'")
  })

  it('uses document navigation from the landing page so the PWA fallback can recover', () => {
    const landing = fs.readFileSync(path.join(ROOT, 'app/page.tsx'), 'utf-8')

    expect(landing).toContain("window.location.replace('/practice')")
    expect(landing).not.toContain("router.prefetch('/practice')")
    expect(landing).not.toContain('useRouter')
    expect(landing).toContain("'landing_auto_navigation'")
    expect(landing).toContain("'landing_manual_navigation'")
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
    expect(diagnostics).toContain("message.source !== 'ashtanga-service-worker'")
    expect(ready).toContain('__ashtangaRuntimeReady')
  })
})
