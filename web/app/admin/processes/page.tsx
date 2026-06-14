'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Upload, Edit2, Trash2 } from 'lucide-react'

interface Process {
  id: string
  crop_type: string
  step_name: string
  step_order: number
  labor_per_ha: number
  frequency: string
}

export default function ProcessesPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [processes, setProcesses] = useState<Process[]>([
    { id: '1', crop_type: 'Gấc', step_name: 'Chuẩn bị đất', step_order: 1, labor_per_ha: 10, frequency: '1 lần' },
    { id: '2', crop_type: 'Gấc', step_name: 'Trồng', step_order: 2, labor_per_ha: 15, frequency: '1 lần' },
    { id: '3', crop_type: 'Sâm', step_name: 'Chuẩn bị', step_order: 1, labor_per_ha: 20, frequency: '1 lần' },
  ])

  useEffect(() => {
    if (!user) router.push('/admin/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Quản lý Quy trình</h1>
        <p className="text-muted-foreground">Quản lý quy trình canh tác Gấc & Sâm</p>
      </div>

      <div className="flex gap-3">
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus size={20} />
          Tạo Quy trình
        </Button>
        <Button variant="outline" className="gap-2">
          <Upload size={20} />
          Import Excel
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Loại cây</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Bước</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Công/ha</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tần suất</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((proc) => (
              <tr key={proc.id} className="border-b border-border hover:bg-secondary/50">
                <td className="px-6 py-4 font-medium">{proc.crop_type}</td>
                <td className="px-6 py-4">{proc.step_name}</td>
                <td className="px-6 py-4">{proc.labor_per_ha}</td>
                <td className="px-6 py-4">{proc.frequency}</td>
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
