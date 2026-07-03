import React from "react"
import type { Metadata, Viewport } from 'next'
import { Noto_Serif_SC } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'sonner'
import { AnalyticsInitializer } from '@/components/AnalyticsInitializer'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { RuntimeDiagnosticsReady } from '@/components/RuntimeDiagnosticsReady'
import { RuntimeDiagnosticsScript } from '@/components/RuntimeDiagnosticsScript'
import './globals.css'

const enableVercelInsights = process.env.NODE_ENV === 'production'
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-serif-sc',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://ash.ashtangalife.online'),
  title: '熬汤日记 - 阿斯汤加瑜伽练习记录与打卡工具',
  description: '免费在线记录阿斯汤加瑜伽练习，支持每日打卡、练习统计、Mysore 风格计时。无需下载，打开网页即用。',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '熬汤日记',
    title: '熬汤日记 - 阿斯汤加瑜伽练习记录与打卡工具',
    description: '免费在线记录阿斯汤加瑜伽练习，支持每日打卡、练习统计、Mysore 风格计时。',
    url: '/',
    images: [{ url: '/icon1204.png', alt: '熬汤日记' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '熬汤日记 - 阿斯汤加瑜伽练习记录与打卡工具',
    description: '免费在线记录阿斯汤加瑜伽练习，支持每日打卡、练习统计、Mysore 风格计时。',
    images: ['/icon1204.png'],
  },
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '熬汤日记',
  },
  formatDetection: {
    telephone: false,
  },
  keywords: '熬汤日记,阿斯汤加,Ashtanga,瑜伽打卡,练习记录,Mysore,Ashtanga Yoga',
  other: {
    'applicable-device': 'mobile',
    'baidu-site-verification': 'codeva-63gDAx1xg3',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <RuntimeDiagnosticsScript />
      <body className={`${notoSerifSC.variable} font-serif antialiased`}>
        <RuntimeDiagnosticsReady />
        <AnalyticsInitializer />
        <ServiceWorkerRegister />
        {children}
        <Toaster position="top-center" toastOptions={{
          className: 'font-serif',
        }} />
        {enableVercelInsights && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}
