'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, AlertCircle, Play } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface TaskDetail {
  id: string
  name: string
  block: string
  crop: string
  status: 'pending' | 'in_progress' | 'completed'
  sop: string
  notes?: string
}

export default function TaskDetailPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) router.push('/mobile/login')
    // Mock load task
    setTask({
      id: taskId,
      name: 'Tưới nước',
      block: 'A1',
      crop: 'Gấc',
      status: 'pending',
      sop: 'Tưới đều nước từ 6-7 giờ sáng. Lượng nước: 30mm. Kiểm tra độ ẩm đất trước khi tưới.',
      notes: '',
    })
    setStatus('pending')
  }, [user, router, taskId])

  const handleStart = () => {
    setStatus('in_progress')
    toast.success('Đã bắt đầu công việc')
  }

  const handleComplete = async () => {
    if (!notes.trim()) {
      toast.error('Vui lòng ghi chú công việc')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setStatus('completed')
      toast.success('Công việc hoàn thành!')
      setLoading(false)
      setTimeout(() => router.push('/mobile'), 1500)
    }, 800)
  }

  if (!task) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/mobile">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft size={24} />
          </Button>
        </Link>
        <div className="flex-1">
          <p className="text-sm opacity-90">Chi tiết công việc</p>
          <h1 className="text-xl font-bold">{task.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-32">
        {/* Task info */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Lô</p>
            <p className="text-2xl font-bold text-foreground">{task.block}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Cây trồng</p>
            <p className="text-lg text-foreground">{task.crop}</p>
          </div>
        </div>

        {/* SOP */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertCircle size={18} className="text-yellow-600" />
            SOP (Quy trình chuẩn)
          </p>
          <div className="bg-secondary/50 p-3 rounded-lg text-sm text-foreground leading-relaxed">
            {task.sop}
          </div>
        </div>

        {/* Status indicator */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Trạng thái</p>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                status === 'pending'
                  ? 'bg-gray-400'
                  : status === 'in_progress'
                  ? 'bg-blue-500'
                  : 'bg-green-500'
              }`}
            ></div>
            <span className="font-semibold text-foreground">
              {status === 'pending'
                ? 'Chưa bắt đầu'
                : status === 'in_progress'
                ? 'Đang làm'
                : 'Hoàn thành'}
            </span>
          </div>
        </div>

        {/* Notes */}
        {status !== 'completed' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú về công việc (VD: Công việc đã hoàn thành, thời tiết tốt)"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={4}
            />
          </div>
        )}

        {/* Completion message */}
        {status === 'completed' && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <p className="flex items-center gap-2 text-green-800 font-semibold">
              <CheckCircle size={20} />
              Công việc đã hoàn thành!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Ghi chú: {task.notes || notes}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons - Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-md mx-auto space-y-3">
        {status === 'pending' && (
          <Button
            onClick={handleStart}
            className="w-full bg-primary text-white text-base font-bold py-3 hover:bg-primary/90 gap-2"
          >
            <Play size={20} />
            Bắt đầu
          </Button>
        )}

        {status === 'in_progress' && (
          <Button
            onClick={handleComplete}
            disabled={loading || !notes.trim()}
            className="w-full bg-green-600 text-white text-base font-bold py-3 hover:bg-green-700 gap-2"
          >
            <CheckCircle size={20} />
            {loading ? 'Đang lưu...' : 'Hoàn thành'}
          </Button>
        )}

        {status === 'completed' && (
          <Link href="/mobile" className="w-full">
            <Button className="w-full bg-primary text-white text-base font-bold py-3 hover:bg-primary/90">
              Quay lại
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
