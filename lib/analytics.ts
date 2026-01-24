import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '110c459d4e609bd51da14e421b2ef4ba';

// 启用数据收集 - Beta版本封闭测试
const MIXPANEL_ENABLED = true;

export const initAnalytics = () => {
  if (typeof window !== 'undefined' && MIXPANEL_ENABLED) {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: true, // 开启调试日志，帮助排查问题
      track_pageview: true, // 保留页面浏览统计
      persistence: 'localStorage',
      autocapture: false, // 关闭自动点击捕获，只收集手动埋点
      api_host: 'https://api-eu.mixpanel.com',
      record_sessions_percent: 0, // 关闭会话录制，保护用户隐私
    });
  }
};

export const identifyUser = (uuid: string) => {
  if (typeof window !== 'undefined' && MIXPANEL_ENABLED) {
    mixpanel.identify(uuid);
  }
};

export const trackEvent = (eventName: string, props?: Record<string, any>) => {
  if (typeof window !== 'undefined' && MIXPANEL_ENABLED) {
    mixpanel.track(eventName, props);
  }
};
