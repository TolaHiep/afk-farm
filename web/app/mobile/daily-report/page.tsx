'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send, AlertTriangle, Camera } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function DailyReportPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [production, setProduction] = useState('')
  const [notes, setNotes] = useState('')
  const [hasAbnormality, setHasAbnormality] = useState(false)
  const [abnormalityType, setAbnormalityType] = useState('')
  const [abnormalityDesc, setAbnormalityDesc] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) router.push('/mobile/login')
  }, [user, router])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPhoto(e.target.files[0])
      toast.success('Đã thêm ảnh')
    }
  }

  const handleSubmit = async () => {
    if (!production.trim()) {
      toast.error('Vui lòng nhập số liệu sản xuất')
      return
    }

    if (hasAbnormality && (!abnormalityType || !photo)) {
      toast.error('Khi có bất thường, bắt buộc phải chọn loại và chụp ảnh')
      return
    }

    setLoading(true)
    setTimeout(() => {
      toast.success('Báo cáo đã gửi!')
      setProduction('')
      setNotes('')
      setHasAbnormality(false)
      setAbnormalityType('')
      setAbnormalityDesc('')
      setPhoto(null)
      setLoading(false)
      setTimeout(() => router.push('/mobile'), 1500)
    }, 1000)
  }

  if (!user) return null

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
          <p className="text-sm opacity-90">Báo cáo</p>
          <h1 className="text-xl font-bold">Cuối ngày</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-32">
        {/* Production data */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Số liệu sản xuất
          </label>
          <input
            type="number"
            value={production}
            onChange={(e) => setProduction(e.target.value)}
            placeholder="VD: 150 (kg/ha)"
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-muted-foreground">Số liệu ghi lại trong ngày</p>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú thêm về công việc..."
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            rows={3}
          />
        </div>

        {/* Abnormality */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAbnormality}
              onChange={(e) => setHasAbnormality(e.target.checked)}
              className="w-5 h-5 rounded border-border cursor-pointer"
            />
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <AlertTriangle size={18} className="text-yellow-600" />
              Báo cáo bất thường
            </span>
          </label>

          {hasAbnormality && (
            <div className="space-y-3 mt-3 pt-3 border-t border-border">
              {/* Abnormality type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Loại bất thường *
                </label>
                <select
                  value={abnormalityType}
                  onChange={(e) => setAbnormalityType(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Chọn loại --</option>
                  <option value="weather">Thời tiết</option>
                  <option value="pest">Côn trùng</option>
                  <option value="disease">Bệnh</option>
                  <option value="supply">Vật tư thiếu</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              {/* Abnormality description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={abnormalityDesc}
                  onChange={(e) => setAbnormalityDesc(e.target.value)}
                  placeholder="Mô tả chi tiết bất thường..."
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={3}
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ảnh chứng minh *
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                  <Camera size={20} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {photo ? photo.name : 'Chọn ảnh'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg text-sm text-blue-800">
          <p>💡 Mẹo: Báo cáo chi tiết giúp quản lý theo dõi tốt hơn</p>
        </div>
      </div>

      {/* Action button - Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-md mx-auto">
        <Button
          onClick={handleSubmit}
          disabled={loading || !production.trim()}
          className="w-full bg-primary text-white text-base font-bold py-3 hover:bg-primary/90 gap-2"
        >
          <Send size={20} />
          {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
        </Button>
      </div>
    </div>
  )
}
