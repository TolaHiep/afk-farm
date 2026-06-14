'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

interface Zone {
  id: string
  name: string
  area_size: number
  blocks_count: number
}

interface Block {
  id: string
  name: string
  zone_id: string
  area_size: number
  status: 'green' | 'yellow' | 'red'
}

export default function ZonesPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [tabs, setTabs] = useState<'zones' | 'blocks'>('zones')
  const [zones, setZones] = useState<Zone[]>([
    { id: '1', name: 'Vùng Đông', area_size: 50, blocks_count: 8 },
    { id: '2', name: 'Vùng Tây', area_size: 45, blocks_count: 6 },
    { id: '3', name: 'Vùng Nam', area_size: 60, blocks_count: 10 },
  ])

  const [blocks, setBlocks] = useState<Block[]>([
    { id: '1', name: 'Lô A1', zone_id: '1', area_size: 5, status: 'green' },
    { id: '2', name: 'Lô A2', zone_id: '1', area_size: 6, status: 'yellow' },
    { id: '3', name: 'Lô B1', zone_id: '2', area_size: 7, status: 'red' },
  ])

  const [showZoneForm, setShowZoneForm] = useState(false)
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [newZone, setNewZone] = useState('')
  const [newBlock, setNewBlock] = useState('')

  useEffect(() => {
    if (!user) router.push('/admin/login')
  }, [user, router])

  const handleAddZone = () => {
    if (!newZone.trim()) {
      toast.error('Vui lòng nhập tên vùng')
      return
    }
    const zone: Zone = {
      id: `z${Date.now()}`,
      name: newZone,
      area_size: Math.random() * 50 + 30,
      blocks_count: 0,
    }
    setZones([...zones, zone])
    setNewZone('')
    setShowZoneForm(false)
    toast.success('Tạo vùng thành công!')
  }

  const handleAddBlock = () => {
    if (!newBlock.trim()) {
      toast.error('Vui lòng nhập tên lô')
      return
    }
    const block: Block = {
      id: `b${Date.now()}`,
      name: newBlock,
      zone_id: '1',
      area_size: Math.random() * 10 + 2,
      status: 'green',
    }
    setBlocks([...blocks, block])
    setNewBlock('')
    setShowBlockForm(false)
    toast.success('Tạo lô thành công!')
  }

  const handleDeleteZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id))
    toast.success('Xóa vùng thành công!')
  }

  const handleDeleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id))
    toast.success('Xóa lô thành công!')
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
    }
    const labels = {
      green: 'Đúng hạn',
      yellow: 'Cảnh báo',
      red: 'Quá hạn',
    }
    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          colors[status as keyof typeof colors]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Quản lý Vùng & Lô
        </h1>
        <p className="text-muted-foreground">
          Thiết lập các vùng trồng và lô ruộng
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setTabs('zones')}
          className={`px-4 py-3 font-medium border-b-2 ${
            tabs === 'zones'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Vùng ({zones.length})
        </button>
        <button
          onClick={() => setTabs('blocks')}
          className={`px-4 py-3 font-medium border-b-2 ${
            tabs === 'blocks'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Lô ({blocks.length})
        </button>
      </div>

      {/* Zones Tab */}
      {tabs === 'zones' && (
        <div className="space-y-4">
          <Button
            onClick={() => setShowZoneForm(!showZoneForm)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus size={20} />
            Tạo Vùng Mới
          </Button>

          {showZoneForm && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <input
                type="text"
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
                placeholder="Tên vùng (VD: Vùng Đông)"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddZone}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  Lưu
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowZoneForm(false)}
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}

          {/* Zones Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Tên Vùng
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Diện tích (ha)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Số Lô
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr
                    key={zone.id}
                    className="border-b border-border hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {zone.name}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {zone.area_size.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {zone.blocks_count}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-primary hover:bg-primary/10"
                        >
                          <Edit2 size={16} />
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteZone(zone.id)}
                        >
                          <Trash2 size={16} />
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blocks Tab */}
      {tabs === 'blocks' && (
        <div className="space-y-4">
          <Button
            onClick={() => setShowBlockForm(!showBlockForm)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus size={20} />
            Tạo Lô Mới
          </Button>

          {showBlockForm && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <input
                type="text"
                value={newBlock}
                onChange={(e) => setNewBlock(e.target.value)}
                placeholder="Tên lô (VD: Lô A1)"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                💡 Ghi chú: Bạn có thể vẽ ranh giới lô trên bản đồ
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddBlock}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <MapPin size={16} />
                  Tạo & Vẽ Bản đồ
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBlockForm(false)}
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}

          {/* Blocks Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Tên Lô
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Vùng
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Diện tích (ha)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => {
                  const zone = zones.find((z) => z.id === block.zone_id)
                  return (
                    <tr
                      key={block.id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {block.name}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {zone?.name}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {block.area_size.toFixed(1)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(block.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-primary hover:bg-primary/10"
                          >
                            <Edit2 size={16} />
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteBlock(block.id)}
                          >
                            <Trash2 size={16} />
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
