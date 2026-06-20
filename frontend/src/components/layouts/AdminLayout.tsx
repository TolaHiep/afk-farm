import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, Map, MapPin, Users, FileText, Sprout, Calendar, TrendingUp,
  Bell, ClipboardList, LifeBuoy, Settings, LogOut, Menu, X, PanelLeftClose, PanelLeft,
} from "lucide-react";
import { useAppSettings } from "../../lib/useAppSettings";
import { useAuth } from "../../lib/auth";
import { getNotifications } from "../../lib/queries";
import { isRead } from "../../lib/notificationsRead";

export function AdminLayout() {
  const app = useAppSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = async () => { await logout(); navigate("/"); };
  const initial = (user?.full_name || user?.email || "A").trim().charAt(0).toUpperCase();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false); // thu gọn trên desktop
  const [mobileOpen, setMobileOpen] = React.useState(false); // drawer trên mobile/tablet
  const [userOpen, setUserOpen] = React.useState(false); // mở nút Đăng xuất khi bấm tên admin

  // Badge số thông báo chưa đọc: poll mỗi 30s + tự refetch khi chuyển trang (URL đổi)
  const [unread, setUnread] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    const refresh = () => {
      getNotifications()
        .then((items: any[]) => { if (alive) setUnread(items.filter((n) => !isRead(n.id)).length); })
        .catch(() => { /* giữ giá trị cũ */ });
    };
    refresh();
    const t = setInterval(refresh, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [location.pathname]);

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

  const labelCls = collapsed ? "ml-3 lg:hidden" : "ml-3";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Lớp phủ khi mở drawer trên mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar: drawer trên mobile (fixed), tĩnh trên desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-transform duration-300
          w-64 ${collapsed ? "lg:w-20" : "lg:w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static`}
      >
        <div className="h-full flex flex-col">
          {/* Logo + toggle */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            <div className={`flex items-center gap-2 min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              {app.logoUrl
                ? <img src={app.logoUrl} alt="logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                : <div className="w-8 h-8 rounded-lg bg-green-600 text-white grid place-items-center font-bold flex-shrink-0">{app.logoText}</div>}
              <h1 className="text-xl font-bold text-green-600 truncate">{app.appName}</h1>
            </div>
            {/* Thu gọn (desktop) */}
            <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg" title="Thu gọn">
              {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            {/* Đóng drawer (mobile) */}
            <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" title="Đóng">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive ? "bg-green-50 text-green-600" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className={labelCls}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User + Logout (bấm tên/avatar để hiện nút Đăng xuất) */}
          <div className="p-3 border-t border-gray-200 space-y-1">
            <button
              onClick={() => setUserOpen((v) => !v)}
              className={`w-full flex items-center px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? "lg:justify-center" : ""}`}
              aria-expanded={userOpen}
            >
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">{initial}</div>
              <span className={`text-sm font-medium text-gray-700 truncate text-left ${labelCls}`}>{user?.full_name || user?.email || "Admin"}</span>
            </button>
            {userOpen && (
              <button onClick={doLogout} className="w-full flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className={labelCls}>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger (mobile) */}
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg" title="Menu">
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="text-base sm:text-xl font-semibold text-gray-800 truncate">
              {menuItems.find((item) => item.path === location.pathname)?.label || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link to="/admin/notifications" className="relative p-2 hover:bg-gray-100 rounded-lg" title={unread > 0 ? `${unread} thông báo chưa đọc` : "Không có thông báo chưa đọc"}>
              <Bell className="w-5 h-5 text-gray-600" />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
