'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BarChart3, Layers, Users, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/admin/login')
    }
  }, [user, router])

  if (!user) return null

  // Mock data
  const stats = [
    { label: 'Tổng Vùng', value: 12, icon: Layers, color: 'bg-blue-100' },
    { label: 'Tổng Lô', value: 48, icon: Layers, color: 'bg-green-100' },
    { label: 'Tổng Tổ', value: 8, icon: Users, color: 'bg-purple-100' },
    { label: 'Việc Hôm nay', value: 24, icon: BarChart3, color: 'bg-yellow-100' },
  ]

  const alertItems = [
    { id: 1, title: 'Lô A1 - Quá hạn', status: 'overdue', priority: 'high' },
    { id: 2, title: 'Lô B3 - Bất thường (sâu bệnh)', status: 'abnormality', priority: 'high' },
    { id: 3, title: 'Lô C2 - Vật tư thiếu', status: 'supply', priority: 'medium' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Chào mừng, {user.name}!
        </h1>
        <p className="text-muted-foreground">
          Tổng quan về hệ thống quản lý sản xuất nông trại
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-primary" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts & Notifications */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="text-destructive" size={24} />
              Cần Chú ý
            </h2>
            <Link href="/admin/alerts">
              <Button variant="ghost" size="sm">
                Xem tất cả
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {alertItems.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      alert.priority === 'high'
                        ? 'bg-destructive'
                        : 'bg-accent'
                    }`}
                  />
                  <span className="text-foreground font-medium">
                    {alert.title}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                  {alert.status === 'overdue'
                    ? 'Quá hạn'
                    : alert.status === 'abnormality'
                    ? 'Bất thường'
                    : 'Vật tư'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Thao tác nhanh</h2>

          <div className="space-y-3">
            <Link href="/admin/zones">
              <Button className="w-full justify-start gap-2 bg-primary hover:bg-primary/90">
                <Layers size={20} />
                Quản lý Lô
              </Button>
            </Link>

            <Link href="/admin/heat-map">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                🗺️
                Bản đồ Nhiệt
              </Button>
            </Link>

            <Link href="/admin/schedule">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                📅
                Lịch Công việc
              </Button>
            </Link>

            <Link href="/admin/teams">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                👥
                Quản lý Tổ
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tasks by Zone Chart placeholder */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold text-foreground mb-6">
          Công việc theo vùng (7 ngày gần đây)
        </h2>
        <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">
            Biểu đồ sẽ được hiển thị tại đây
          </p>
        </div>
      </div>
    </div>
  )
}
