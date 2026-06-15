import React from "react";
import { Outlet, Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  Map, 
  MapPin, 
  Users, 
  FileText, 
  Sprout, 
  Calendar,
  TrendingUp,
  Bell,
  ClipboardList,
  LifeBuoy,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";

export function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const menuItems = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/heatmap", icon: Map, label: "Bản đồ nhiệt" },
    { path: "/admin/zones", icon: MapPin, label: "Vùng & Lô" },
    { path: "/admin/teams", icon: Users, label: "Tổ & Tổ viên" },
    { path: "/admin/processes", icon: FileText, label: "Quy trình" },
    { path: "/admin/crop-cycles", icon: Sprout, label: "Chu kỳ cây trồng" },
    { path: "/admin/calendar", icon: Calendar, label: "Lịch công việc" },
    { path: "/admin/kpi", icon: TrendingUp, label: "KPI Tổ trưởng" },
    { path: "/admin/reports", icon: ClipboardList, label: "Báo cáo tổ trưởng" },
    { path: "/admin/support", icon: LifeBuoy, label: "Yêu cầu hỗ trợ" },
    { path: "/admin/notifications", icon: Bell, label: "Thông báo" },
    { path: "/admin/settings", icon: Settings, label: "Cài đặt" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
            {sidebarOpen && <h1 className="text-xl font-bold text-green-600">Farm Admin</h1>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="ml-3">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-gray-200">
            <Link
              to="/"
              className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="ml-3">Đăng xuất</span>}
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {menuItems.find(item => item.path === location.pathname)?.label || "Dashboard"}
          </h2>
          <div className="flex items-center gap-4">
            <Link to="/admin/notifications" className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium">
                A
              </div>
              <span className="text-sm font-medium text-gray-700">Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
