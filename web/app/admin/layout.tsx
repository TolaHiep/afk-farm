'use client'

import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/admin/sidebar'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, hasHydrated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (hasHydrated && !user && !isLoginPage) {
      router.push('/admin/login')
    }
  }, [user, hasHydrated, isLoginPage, router])

  // Trang đăng nhập không bị bọc bởi khung quản trị (tránh vòng lặp redirect)
  if (isLoginPage) {
    return <>{children}</>
  }

  if (!hasHydrated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto md:ml-0">
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  )
}

