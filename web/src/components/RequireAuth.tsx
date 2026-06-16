import { Navigate, Outlet } from "react-router";
import { useAuth } from "../lib/auth";

// Chặn truy cập khi chưa đăng nhập / sai vai trò. Dùng làm route cha bọc layout.
export function RequireAuth({ role }: { role?: "admin" | "team_leader" }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Đang tải…</div>;
  }
  if (!user) {
    return <Navigate to={role === "team_leader" ? "/mobile/login" : "/"} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/mobile"} replace />;
  }
  return <Outlet />;
}
