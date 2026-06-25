const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '110c459d4e609bd51da14e421b2ef4ba'
const MIXPANEL_ENABLED = process.env.NEXT_PUBLIC_DISABLE_ANALYTICS !== 'true'

type MixpanelClient = typeof import('mixpanel-browser').default

let analyticsPromise: Promise<MixpanelClient | null> | null = null

const loadAnalytics = () => {
  if (typeof window === 'undefined' || !MIXPANEL_ENABLED) {
    return Promise.resolve(null)
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return Promise.resolve(null)
  }

  if (!analyticsPromise) {
    analyticsPromise = new Promise<MixpanelClient | null>((resolve) => {
      const load = () => {
        import('mixpanel-browser')
          .then(({ default: mixpanel }) => {
            mixpanel.init(MIXPANEL_TOKEN, {
              debug: false,
              track_pageview: true,
              persistence: 'localStorage',
              autocapture: false,
              record_sessions_percent: 0,
            })
            resolve(mixpanel)
          })
          .catch((error) => {
            console.log('[Analytics] Mixpanel load failed (likely blocked by extension):', error)
            resolve(null)
          })
      }

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(load, { timeout: 2000 })
      } else {
        globalThis.setTimeout(load, 1500)
      }
    })
  }

  return analyticsPromise
}

const safeMixpanelCall = (fn: (mixpanel: MixpanelClient) => void) => {
  void loadAnalytics().then((mixpanel) => {
    if (!mixpanel) return

    try {
      fn(mixpanel)
    } catch (error) {
      console.log('[Analytics] Mixpanel call failed (likely blocked by extension):', error)
    }
  })
}

export const initAnalytics = () => {
  void loadAnalytics()
}

export const identifyUser = (uuid: string) => {
  safeMixpanelCall((mixpanel) => mixpanel.identify(uuid))
}

export const trackEvent = (eventName: string, props?: Record<string, any>) => {
  safeMixpanelCall((mixpanel) => mixpanel.track(eventName, props))
}

export const setUserProfile = (props: Record<string, any>) => {
  safeMixpanelCall((mixpanel) => mixpanel.people.set(props))
}
