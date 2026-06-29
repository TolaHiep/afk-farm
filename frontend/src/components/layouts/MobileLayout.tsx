import React from "react";
import { Outlet, Link, useLocation } from "react-router";
import { CheckSquare, Calendar, ClipboardList, Bell, User, RefreshCw } from "lucide-react";
import { useAppSettings } from "../../lib/useAppSettings";
import { listOffline, replayOffline } from "../../lib/offline";

export function MobileLayout() {
  const location = useLocation();
  const app = useAppSettings();
  // Badge số mục offline chờ đồng bộ (poll qua online/offline event + interval nhẹ)
  const [pending, setPending] = React.useState(() => listOffline().length);
  React.useEffect(() => {
    const tick = () => setPending(listOffline().length);
    // Tự đồng bộ toàn cục: vừa có mạng (hoặc mở app) là gửi hàng đợi, không cần mở màn "Đồng bộ".
    let busy = false;
    const onOnline = async () => {
      tick();
      if (busy || !navigator.onLine || listOffline().length === 0) return;
      busy = true;
      try { await replayOffline(); } finally { busy = false; tick(); }
    };
    onOnline();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", tick);
    window.addEventListener("storage", tick);
    const t = setInterval(tick, 5000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", tick);
      window.removeEventListener("storage", tick);
      clearInterval(t);
    };
  }, []);

  const navItems = [
    { path: "/mobile/tasks", icon: CheckSquare, label: "Hôm nay" },
    { path: "/mobile/upcoming", icon: Calendar, label: "Sắp tới" },
    { path: "/mobile/history", icon: ClipboardList, label: "Lịch sử" },
    { path: "/mobile/notifications", icon: Bell, label: "Thông báo" },
    { path: "/mobile/offline", icon: RefreshCw, label: "Đồng bộ", badge: pending },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-[390px] mx-auto">
      {/* Top Bar */}
      <header className="bg-green-600 text-white p-4 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {app.logoUrl && <img src={app.logoUrl} alt="logo" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />}
            <h1 className="text-lg font-bold truncate">{app.appName}</h1>
          </div>
          <Link to="/mobile/account" className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <span className="text-sm">Tổ trưởng</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const badge = (item as any).badge as number | undefined;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center py-3 px-3 flex-1 transition-colors ${
                  isActive ? "text-green-600" : "text-gray-600"
                }`}
              >
                <div className="relative">
                  <item.icon className="w-6 h-6" />
                  {badge && badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
