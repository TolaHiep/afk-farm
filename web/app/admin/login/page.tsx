'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
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
      toast.error('Vui lòng nhập email và mật khẩu')
      return
    }

    setLoading(true)

    // Simulate API call (trong thực tế sẽ gọi API backend)
    setTimeout(() => {
      const mockUser = {
        id: '1',
        email,
        name: 'Admin Nông trại',
        role: 'admin' as const,
        phone: '0912345678',
      }

      setUser(mockUser)

      if (rememberMe) {
        localStorage.setItem('user', JSON.stringify(mockUser))
        localStorage.setItem('rememberMe', 'true')
      }

      toast.success('Đăng nhập thành công!')
      router.push('/admin')
      setLoading(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">🌾</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Hệ thống Quản lý
            </h1>
            <p className="text-muted-foreground">Sản xuất Nông trại</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="admin@nongrai.vn"
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                  className="w-full pl-10 pr-10 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
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
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          {/* Demo */}
          <div className="mt-6 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Demo (Tên người dùng):</p>
            <p>Email: admin@nongrai.vn</p>
            <p>Mật khẩu: bất kỳ</p>
          </div>

          {/* Links */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Tổ trưởng?{' '}
              <Link
                href="/mobile"
                className="text-primary hover:underline font-medium"
              >
                Truy cập App Mobile
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
