import React from "react";
import { Outlet, Link, useLocation } from "react-router";
import { CheckSquare, Calendar, ClipboardList, Bell, User } from "lucide-react";

export function MobileLayout() {
  const location = useLocation();

  const navItems = [
    { path: "/mobile/tasks", icon: CheckSquare, label: "Hôm nay" },
    { path: "/mobile/upcoming", icon: Calendar, label: "Sắp tới" },
    { path: "/mobile/history", icon: ClipboardList, label: "Lịch sử BC" },
    { path: "/mobile/notifications", icon: Bell, label: "Thông báo" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-[390px] mx-auto">
      {/* Top Bar */}
      <header className="bg-green-600 text-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Farm Mobile</h1>
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
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-3 px-4 transition-colors ${
                  isActive ? "text-green-600" : "text-gray-600"
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
