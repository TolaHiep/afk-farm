import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Ứng dụng Tổ trưởng - Quản lý Nông trại',
  description: 'Ứng dụng di động cho tổ trưởng',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className="bg-background">
      <body className="font-sans antialiased bg-background">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
