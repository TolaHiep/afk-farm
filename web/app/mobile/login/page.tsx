'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, Smartphone } from 'lucide-react'

export default function MobileLogin() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Vui lòng nhập tất cả thông tin')
      return
    }

    setLoading(true)

    setTimeout(() => {
      const mockUser = {
        id: '101',
        email,
        name: 'Tổ trưởng A',
        role: 'team_lead' as const,
        phone: '0912345678',
        team_id: '1',
      }

      setUser(mockUser)

      if (rememberMe) {
        localStorage.setItem('user', JSON.stringify(mockUser))
        localStorage.setItem('rememberMe', 'true')
      }

      toast.success('Đăng nhập thành công!')
      router.push('/mobile')
      setLoading(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg">
          <Smartphone size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-center text-foreground">
          Ứng dụng Tổ trưởng
        </h1>
        <p className="text-sm text-center text-muted-foreground mt-2">
          Quản lý sản xuất nông trại
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="w-full space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-3 text-muted-foreground"
              size={20}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tochutruong@nongrai.vn"
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-3 text-muted-foreground"
              size={20}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground"
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-border cursor-pointer"
          />
          <label
            htmlFor="remember"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Nhớ đăng nhập
          </label>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 text-base font-semibold"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      {/* Demo info */}
      <div className="mt-8 w-full p-3 bg-secondary rounded-lg text-xs text-muted-foreground">
        <p className="font-semibold mb-1">Demo:</p>
        <p>Email: totruong@nongrai.vn</p>
        <p>Mật khẩu: bất kỳ</p>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>Phiên bản: 1.0.0</p>
        <p>Hỗ trợ: admin@nongrai.vn</p>
      </div>
    </div>
  )
}
