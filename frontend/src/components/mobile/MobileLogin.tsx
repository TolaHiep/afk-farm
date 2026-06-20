import React from "react";
import { Link, useNavigate } from "react-router";
import { Sprout } from "lucide-react";
import { useAuth } from "../../lib/auth";

export function MobileLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(username, password);
      // Tổ trưởng vào giao diện mobile; nếu là admin thì điều hướng đúng khu vực admin.
      navigate(u.role === "admin" ? "/admin/dashboard" : "/mobile/tasks");
    } catch {
      setError("Tài khoản hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-600 flex flex-col justify-center items-center p-6 max-w-[390px] mx-auto">
      {/* Logo */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
          <Sprout className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Farm Mobile</h1>
        <p className="text-green-100">Dành cho tổ trưởng</p>
      </div>

      {/* Login Form */}
      <div className="w-full bg-white rounded-2xl p-6 shadow-xl">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="username" className="block text-base font-semibold text-gray-700 mb-2">
              Tài khoản
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg"
              placeholder="Email hoặc số điện thoại"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-semibold text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg"
              placeholder="Nhập mật khẩu"
            />
          </div>

          {error && <p className="text-base text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors mt-6 disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </div>

      {/* Admin Link */}
      <Link to="/" className="mt-8 text-white text-base hover:text-green-100">
        ← Quay lại trang Admin
      </Link>
    </div>
  );
}
