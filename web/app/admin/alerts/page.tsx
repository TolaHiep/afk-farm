'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Eye, AlertTriangle } from 'lucide-react'

interface Alert {
  id: string
  type: string
  title: string
  block: string
  message: string
  created_at: string
  is_read: boolean
}

export default function AlertsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'overdue',
      title: 'Công việc quá hạn',
      block: 'A1',
      message: 'Tưới nước lô A1 đã quá hạn 5 ngày',
      created_at: '2024-06-15 09:30',
      is_read: false,
    },
    {
      id: '2',
      type: 'abnormality',
      title: 'Bất thường mới',
      block: 'B1',
      message: 'Phát hiện sâu bệnh ở lô B1',
      created_at: '2024-06-15 08:45',
      is_read: false,
    },
    {
      id: '3',
      type: 'supply',
      title: 'Vật tư thiếu',
      block: 'C2',
      message: 'Vật tư phân bón sắp hết cho lô C2',
      created_at: '2024-06-14 16:20',
      is_read: true,
    },
  ])

  useEffect(() => {
    if (!user) router.push('/admin/login')
  }, [user, router])

  const getAlertColor = (type: string) => {
    const colors = {
      overdue: 'bg-red-100 text-red-800 border-red-300',
      abnormality: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      supply: 'bg-orange-100 text-orange-800 border-orange-300',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getAlertIcon = (type: string) => {
    const icons: Record<string, string> = {
      overdue: '⏰',
      abnormality: '⚠️',
      supply: '📦',
    }
    return icons[type] || '🔔'
  }

  const handleDelete = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id))
  }

  const handleMarkAsRead = (id: string) => {
    setAlerts(
      alerts.map((a) =>
        a.id === id ? { ...a, is_read: true } : a
      )
    )
  }

  if (!user) return null

  const unreadCount = alerts.filter((a) => !a.is_read).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Thông báo & Cảnh báo
        </h1>
        <p className="text-muted-foreground">
          Theo dõi các sự kiện quan trọng trong hệ thống
          {unreadCount > 0 && (
            <span className="ml-2 px-3 py-1 rounded-full bg-destructive text-white text-sm font-medium">
              {unreadCount} mới
            </span>
          )}
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline">Tất cả</Button>
        <Button variant="outline">Chưa đọc</Button>
        <Button variant="outline">Quá hạn</Button>
        <Button variant="outline">Bất thường</Button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border-l-4 rounded-lg p-4 transition-all ${
              alert.is_read
                ? 'bg-secondary/50 border-gray-300'
                : `${getAlertColor(alert.type)} border-l-4`
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-2xl mt-1">{getAlertIcon(alert.type)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">
                    {alert.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Lô: <span className="font-medium">{alert.block}</span></span>
                    <span>{alert.created_at}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {!alert.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-primary hover:bg-primary/10"
                    onClick={() => handleMarkAsRead(alert.id)}
                  >
                    <Eye size={16} />
                    Đánh dấu
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(alert.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <AlertTriangle size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Không có cảnh báo</p>
        </div>
      )}
    </div>
  )
}
