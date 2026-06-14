'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react'

interface CropCycle {
  id: string
  block: string
  crop_type: string
  start_date: string
  end_date: string
  status: string
}

export default function CropCyclesPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [cycles, setCycles] = useState<CropCycle[]>([
    { id: '1', block: 'A1', crop_type: 'Gấc', start_date: '2024-06-01', end_date: '2024-08-31', status: 'Đang diễn ra' },
    { id: '2', block: 'A2', crop_type: 'Sâm', start_date: '2024-07-15', end_date: '2024-10-15', status: 'Sắp bắt đầu' },
  ])

  useEffect(() => {
    if (!user) router.push('/admin/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Chu kỳ Cây trồng</h1>
        <p className="text-muted-foreground">Khai báo và theo dõi chu kỳ canh tác</p>
      </div>

      <Button className="gap-2 bg-primary hover:bg-primary/90">
        <Plus size={20} />
        Khai báo Chu kỳ
      </Button>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Lô</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Cây</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ngày bắt đầu</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Dự kiến kết thúc</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Trạng thái</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((cycle) => (
              <tr key={cycle.id} className="border-b border-border hover:bg-secondary/50">
                <td className="px-6 py-4 font-medium">{cycle.block}</td>
                <td className="px-6 py-4">{cycle.crop_type}</td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  {cycle.start_date}
                </td>
                <td className="px-6 py-4">{cycle.end_date}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary font-medium">
                    {cycle.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
