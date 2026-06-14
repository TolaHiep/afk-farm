import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fira_Sans, Fira_Code } from 'next/font/google'
import './globals.css'

// Theo khuyến nghị ui-ux-pro-max cho dashboard dữ liệu: Fira Sans (body) + Fira Code (số liệu/mono)
const geistSans = Fira_Sans({
  variable: '--font-geist-sans',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
})
const geistMono = Fira_Code({
  variable: '--font-geist-mono',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Hệ thống Quản lý Sản xuất Nông trại',
  description: 'Ứng dụng quản lý sản xuất nông trại thông minh',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#15803D' },
    { media: '(prefers-color-scheme: dark)', color: '#15803D' },
  ],
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      className={`light ${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#15803D" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nông trại" />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

