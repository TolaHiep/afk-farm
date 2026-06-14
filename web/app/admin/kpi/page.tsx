'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'

interface KPIRecord {
  id: string
  team: string
  on_time: number
  overdue: number
  completed: number
  reports: number
  abnormalities: number
  total_labor: number
}

export default function KPIPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [kpis, setKpis] = useState<KPIRecord[]>([
    { id: '1', team: 'Tổ 1', on_time: 45, overdue: 2, completed: 47, reports: 47, abnormalities: 1, total_labor: 180 },
    { id: '2', team: 'Tổ 2', on_time: 52, overdue: 3, completed: 55, reports: 54, abnormalities: 2, total_labor: 210 },
    { id: '3', team: 'Tổ 3', on_time: 38, overdue: 5, completed: 43, reports: 42, abnormalities: 3, total_labor: 165 },
  ])

  useEffect(() => {
    if (!user) router.push('/admin/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">KPI Tổ trưởng</h1>
        <p className="text-muted-foreground">Đánh giá hiệu suất làm việc của các tổ</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="px-4 py-2 border border-border rounded-lg">
          <option>Tháng 6</option>
          <option>Tháng 7</option>
          <option>Tháng 8</option>
        </select>
        <select className="px-4 py-2 border border-border rounded-lg">
          <option>Năm 2024</option>
          <option>Năm 2023</option>
        </select>
      </div>

      {/* KPI Table */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tổ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Đúng hạn</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Quá hạn</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Hoàn thành</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Báo cáo đầy đủ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Bất thường</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tổng công (giờ)</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => (
              <tr key={kpi.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{kpi.team}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 font-medium">
                    {kpi.on_time}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 font-medium">
                    {kpi.overdue}
                  </span>
                </td>
                <td className="px-6 py-4 text-foreground">{kpi.completed}</td>
                <td className="px-6 py-4">
                  <span className="text-foreground font-medium">{kpi.reports}/{kpi.completed}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 font-medium">
                    {kpi.abnormalities}
                  </span>
                </td>
                <td className="px-6 py-4 text-foreground font-medium">{kpi.total_labor}</td>
                <td className="px-6 py-4">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary hover:bg-primary/10">
                    <TrendingUp size={16} />
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Tổng công việc đúng hạn</p>
          <p className="text-3xl font-bold text-green-600">
            {kpis.reduce((sum, k) => sum + k.on_time, 0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Tổng công việc quá hạn</p>
          <p className="text-3xl font-bold text-red-600">
            {kpis.reduce((sum, k) => sum + k.overdue, 0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Bất thường</p>
          <p className="text-3xl font-bold text-yellow-600">
            {kpis.reduce((sum, k) => sum + k.abnormalities, 0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Tổng công (giờ)</p>
          <p className="text-3xl font-bold text-primary">
            {kpis.reduce((sum, k) => sum + k.total_labor, 0)}
          </p>
        </div>
      </div>
    </div>
  )
}
