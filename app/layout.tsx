import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Noto_Serif_SC } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { AnalyticsInitializer } from '@/components/AnalyticsInitializer'
import './globals.css'

const _inter = Inter({ subsets: ["latin"] });
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] });
const _notoSerifSC = Noto_Serif_SC({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

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
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AnalyticsInitializer />
        {children}
        <Toaster position="top-center" />
        <Analytics />
      </body>
    </html>
  )
}
