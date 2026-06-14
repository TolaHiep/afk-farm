'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { BarChart3, Smartphone } from 'lucide-react'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    // Detect if it's mobile device
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )

    // Auto-redirect based on device
    if (isMobile) {
      router.push('/mobile/login')
    }
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        {/* Logo/Icon */}
        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-5xl">🌾</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
          Hệ thống Quản lý Sản xuất
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Nông trại thông minh - Quản lý tối ưu
        </p>

        {/* Description */}
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
          Nền tảng tích hợp giúp quản lý toàn bộ quy trình sản xuất nông trại từ lập kế hoạch,
          theo dõi thực hiện đến báo cáo kết quả.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button
            onClick={() => router.push('/admin/login')}
            size="lg"
            className="gap-2 bg-primary text-white hover:bg-primary/90 text-base px-8"
          >
            <BarChart3 size={24} />
            Admin - Quản trị
          </Button>
          <Button
            onClick={() => router.push('/mobile/login')}
            variant="outline"
            size="lg"
            className="gap-2 text-base px-8"
          >
            <Smartphone size={24} />
            Mobile - Tổ trưởng
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold text-foreground mb-2">Dashboard thông minh</h3>
            <p className="text-sm text-muted-foreground">
              Giám sát toàn bộ hoạt động sản xuất trên bản đồ nhiệt
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-bold text-foreground mb-2">App mobile dễ dùng</h3>
            <p className="text-sm text-muted-foreground">
              Giao diện đơn giản, hoạt động offline, thao tác một tay
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-foreground mb-2">Tự động hóa</h3>
            <p className="text-sm text-muted-foreground">
              Tự động sinh công việc, theo dõi KPI, cảnh báo sự cố
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Demo accounts: Admin & Tổ trưởng
          </p>
          <p className="text-xs text-muted-foreground">
            Version 1.0.0 | © 2024 Nông trại thông minh
          </p>
        </div>
      </div>
    </main>
  )
}

