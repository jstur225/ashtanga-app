import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '5268a97b486c115e4ac42757c2570f78';

export const initAnalytics = () => {
  if (typeof window !== 'undefined') {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: true, // Force debug mode to see logs in production console
      track_pageview: true,
      persistence: 'localStorage',
      autocapture: true,
      api_host: 'https://api-eu.mixpanel.com',
      record_sessions_percent: 100,
    });
  }
};

export const identifyUser = (uuid: string) => {
  if (typeof window !== 'undefined') {
    mixpanel.identify(uuid);
  }
};

export const trackEvent = (eventName: string, props?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    mixpanel.track(eventName, props);
  }
};
