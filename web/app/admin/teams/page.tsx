'use client'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'

interface Team {
  id: string
  name: string
  team_lead: string
  members_count: number
}

export default function TeamsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'Tổ 1', team_lead: 'Nguyễn Văn A', members_count: 5 },
    { id: '2', name: 'Tổ 2', team_lead: 'Trần Thị B', members_count: 6 },
    { id: '3', name: 'Tổ 3', team_lead: 'Lê Văn C', members_count: 4 },
  ])

  useEffect(() => {
    if (!user) router.push('/admin/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Quản lý Tổ</h1>
        <p className="text-muted-foreground">Quản lý tổ trưởng và thành viên</p>
      </div>

      <Button className="gap-2 bg-primary hover:bg-primary/90">
        <Plus size={20} />
        Tạo Tổ Mới
      </Button>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tên Tổ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tổ trưởng</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Số thành viên</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b border-border hover:bg-secondary/50">
                <td className="px-6 py-4 font-medium">{team.name}</td>
                <td className="px-6 py-4">{team.team_lead}</td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  {team.members_count}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                      <Edit2 size={16} />
                      Sửa
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-destructive">
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
  )
}
