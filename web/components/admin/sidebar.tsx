'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore, useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Map,
  Users,
  Layers,
  Calendar,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

export function AdminSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isActive = (path: string) => pathname.startsWith(path)

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: BarChart3 },
    { label: 'Bản đồ Nhiệt', path: '/admin/heat-map', icon: Map },
    { label: 'Quản lý Vùng & Lô', path: '/admin/zones', icon: Layers },
    { label: 'Quản lý Tổ', path: '/admin/teams', icon: Users },
    { label: 'Quy trình Canh tác', path: '/admin/processes', icon: Settings },
    { label: 'Chu kỳ Cây trồng', path: '/admin/crop-cycles', icon: Layers },
    { label: 'Lịch Công việc', path: '/admin/schedule', icon: Calendar },
    { label: 'KPI Tổ trưởng', path: '/admin/kpi', icon: BarChart3 },
    { label: 'Cảnh báo', path: '/admin/alerts', icon: Bell },
  ]

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-40 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-30 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:relative md:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold">Nông Trại</h1>
          <p className="text-xs text-sidebar-foreground/70">Quản lý SX</p>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <li key={item.path}>
                  <Link href={item.path}>
                    <Button
                      variant={active ? 'default' : 'ghost'}
                      className={`w-full justify-start gap-3 ${
                        active
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'hover:bg-sidebar-accent/10'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="relative">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-left h-auto py-2"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs opacity-70 truncate">{user?.email}</p>
              </div>
            </Button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 bg-card text-foreground rounded-lg shadow-lg mb-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-destructive"
                  onClick={() => {
                    logout()
                    setShowUserMenu(false)
                  }}
                >
                  <LogOut size={18} />
                  Đăng xuất
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}
