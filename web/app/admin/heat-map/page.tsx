'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, AlertCircle, Info } from 'lucide-react'

interface MapBlock {
  id: string
  name: string
  status: 'green' | 'yellow' | 'red'
  tasks: number
  details: string
}

export default function HeatMapPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [blocks, setBlocks] = useState<MapBlock[]>([
    { id: '1', name: 'Lô A1', status: 'green', tasks: 3, details: 'Đúng hạn' },
    { id: '2', name: 'Lô A2', status: 'yellow', tasks: 5, details: 'Cảnh báo' },
    { id: '3', name: 'Lô B1', status: 'red', tasks: 2, details: 'Quá hạn' },
  ])
  const [selectedBlock, setSelectedBlock] = useState<MapBlock | null>(null)

  useEffect(() => {
    if (!user) router.push('/admin/login')
  }, [user, router])

  const getStatusColor = (status: string) => {
    const colors = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-500'
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Bản đồ Nhiệt</h1>
        <p className="text-muted-foreground">Giám sát trạng thái các lô trồng</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-card p-4 rounded-lg border border-border">
        <input type="date" className="px-4 py-2 border border-border rounded-lg" />
        <select className="px-4 py-2 border border-border rounded-lg">
          <option>Tất cả cây</option>
          <option>Gấc</option>
          <option>Sâm</option>
        </select>
        <select className="px-4 py-2 border border-border rounded-lg">
          <option>Tất cả trạng thái</option>
          <option>Xanh (Đúng hạn)</option>
          <option>Vàng (Cảnh báo)</option>
          <option>Đỏ (Quá hạn)</option>
        </select>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map placeholder */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6 h-96 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Bản đồ tương tác sẽ được hiển thị tại đây</p>
            <div className="flex gap-4 justify-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Đúng hạn</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Cảnh báo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Quá hạn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Block details panel */}
        <div className="bg-card rounded-lg border border-border p-6 h-96 overflow-y-auto">
          <h2 className="font-bold text-foreground mb-4">Danh sách Lô</h2>
          <div className="space-y-2">
            {blocks.map((block) => (
              <div
                key={block.id}
                onClick={() => setSelectedBlock(block)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedBlock?.id === block.id
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-secondary border border-border hover:bg-secondary/80'
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${getStatusColor(block.status)}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{block.name}</p>
                    <p className="text-xs text-muted-foreground">{block.details}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground ml-5">{block.tasks} công việc</p>
              </div>
            ))}
          </div>

          {selectedBlock && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="font-semibold text-foreground mb-2">Chi tiết: {selectedBlock.name}</h3>
              <div className="space-y-2 text-sm mb-4">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Trạng thái:</span> {selectedBlock.details}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Công việc:</span> {selectedBlock.tasks}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="text-sm gap-2 bg-primary hover:bg-primary/90 w-full">
                  Gán lại
                </Button>
                <Button variant="outline" className="text-sm gap-2 w-full">
                  Lùi lịch
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Info size={20} />
          Hướng dẫn
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
              <div className="w-6 h-6 bg-green-500 rounded"></div>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Xanh - Đúng hạn</p>
              <p className="text-xs text-muted-foreground">Công việc đang diễn ra đúng kế hoạch</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded flex items-center justify-center flex-shrink-0">
              <div className="w-6 h-6 bg-yellow-500 rounded"></div>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Vàng - Cảnh báo</p>
              <p className="text-xs text-muted-foreground">Công việc sắp quá hạn hoặc có bất thường</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
              <div className="w-6 h-6 bg-red-500 rounded"></div>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Đỏ - Quá hạn</p>
              <p className="text-xs text-muted-foreground">Công việc đã quá thời hạn hoặc bất thường nghiêm trọng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
