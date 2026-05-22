import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Serif_SC } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'sonner'
import { AnalyticsInitializer } from '@/components/AnalyticsInitializer'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif-sc",
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: '熬汤日记·呼吸·觉察',
  description: '用宋体禅意记录你的阿斯汤加瑜伽练习',
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
      <body className={`${inter.variable} ${notoSerifSC.variable} font-sans antialiased`}>
        <AnalyticsInitializer />
        <ServiceWorkerRegister />
        {children}
        <Toaster position="top-center" toastOptions={{
          className: 'font-serif',
        }} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
