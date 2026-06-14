'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'

interface Task {
  id: string
  name: string
  block: string
  crop: string
  team_lead: string
  date: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  days_remaining: number
}

export default function SchedulePage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', name: 'Tưới nước', block: 'A1', crop: 'Gấc', team_lead: 'Nguyễn Văn A', date: '2024-06-15', status: 'completed', days_remaining: 0 },
    { id: '2', name: 'Bón phân', block: 'A1', crop: 'Gấc', team_lead: 'Nguyễn Văn A', date: '2024-06-16', status: 'in_progress', days_remaining: 1 },
    { id: '3', name: 'Phun thuốc', block: 'B1', crop: 'Sâm', team_lead: 'Trần Thị B', date: '2024-06-17', status: 'pending', days_remaining: 2 },
    { id: '4', name: 'Thu hoạch', block: 'C1', crop: 'Gấc', team_lead: 'Lê Văn C', date: '2024-06-10', status: 'overdue', days_remaining: -5 },
  ])

  useEffect(() => {
    if (!user) router.push('/admin/login')
  }, [user, router])

  const getStatusBadge = (status: Task['status']) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    }
    const labels = {
      pending: 'Chưa bắt đầu',
      in_progress: 'Đang làm',
      completed: 'Hoàn thành',
      overdue: 'Quá hạn',
    }
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>{labels[status]}</span>
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Lịch Công việc (10 ngày)</h1>
        <p className="text-muted-foreground">Quản lý và theo dõi công việc hàng ngày</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Tìm vùng..." className="px-4 py-2 border border-border rounded-lg" />
        <input type="text" placeholder="Tìm lô..." className="px-4 py-2 border border-border rounded-lg" />
        <input type="text" placeholder="Tìm tổ trưởng..." className="px-4 py-2 border border-border rounded-lg" />
        <Button variant="outline" className="gap-2">
          Đặt lại
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-card rounded-lg border border-border p-4">
        <Button variant="outline" size="sm">
          <ChevronLeft size={20} />
        </Button>
        <span className="font-semibold text-foreground">Tuần 24 - 30 tháng 6</span>
        <Button variant="outline" size="sm">
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* Tasks list */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-2">{task.name}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} /> Lô: {task.block} - {task.crop}
                  </span>
                  <span>Tổ: {task.team_lead}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={16} /> {task.date}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {getStatusBadge(task.status)}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Gán lại</Button>
                  <Button variant="outline" size="sm">Lùi lịch</Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
