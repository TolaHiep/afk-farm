'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Clock, MapPin, Leaf, ChevronRight, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Task {
  id: string
  name: string
  block: string
  crop: string
  status: 'pending' | 'in_progress' | 'completed'
  date: string
}

export default function MobileTasksPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', name: 'Tưới nước', block: 'A1', crop: 'Gấc', status: 'pending', date: '2024-06-15' },
    { id: '2', name: 'Bón phân', block: 'A1', crop: 'Gấc', status: 'in_progress', date: '2024-06-15' },
    { id: '3', name: 'Phun thuốc', block: 'B1', crop: 'Sâm', status: 'pending', date: '2024-06-15' },
  ])
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'next'>('today')

  useEffect(() => {
    if (!user) router.push('/mobile/login')
  }, [user, router])

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
    }
    const labels = {
      pending: 'Chưa bắt đầu',
      in_progress: 'Đang làm',
      completed: 'Hoàn thành',
    }
    return { color: colors[status], label: labels[status] }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-10">
        <p className="text-sm opacity-90">Chào, {user.name}</p>
        <h1 className="text-2xl font-bold">Việc hôm nay</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4 border-b border-border sticky top-14 bg-background">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            activeTab === 'today'
              ? 'bg-primary text-white'
              : 'bg-secondary text-foreground'
          }`}
        >
          Hôm nay
        </button>
        <button
          onClick={() => setActiveTab('tomorrow')}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            activeTab === 'tomorrow'
              ? 'bg-primary text-white'
              : 'bg-secondary text-foreground'
          }`}
        >
          Ngày mai
        </button>
        <button
          onClick={() => setActiveTab('next')}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            activeTab === 'next'
              ? 'bg-primary text-white'
              : 'bg-secondary text-foreground'
          }`}
        >
          Ngày kia
        </button>
      </div>

      {/* Tasks List */}
      <div className="p-4 space-y-3">
        {tasks.map((task) => {
          const { color, label } = getStatusColor(task.status)
          return (
            <Link key={task.id} href={`/mobile/task-detail/${task.id}`}>
              <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow active:shadow-lg">
                {/* Task name */}
                <h3 className="text-lg font-bold text-foreground mb-3">
                  {task.name}
                </h3>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={16} className="text-primary" />
                    <span>Lô: <span className="font-semibold text-foreground">{task.block}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Leaf size={16} className="text-primary" />
                    <span>Cây: <span className="font-semibold text-foreground">{task.crop}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={16} className="text-primary" />
                    <span>{task.date}</span>
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
                      {label}
                    </span>
                  </div>
                </div>

                {/* CTA button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chi tiết công việc</span>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Fixed bottom action button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-md mx-auto">
        <Link href="/mobile/daily-report">
          <Button className="w-full bg-primary text-white text-base font-bold py-3 hover:bg-primary/90 gap-2">
            <BarChart3 size={20} />
            Báo cáo cuối ngày
          </Button>
        </Link>
      </div>
    </div>
  )
}
