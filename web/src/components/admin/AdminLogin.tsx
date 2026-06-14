import React from "react";
import { Link } from "react-router";
import { Sprout } from "lucide-react";
import { Button } from "../ui/Button";

export function AdminLogin() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
            <Sprout className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Admin</h1>
          <p className="text-gray-600 mt-1">Hệ thống quản lý sản xuất nông trại</p>
        </div>

        {/* Login Form */}
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="admin@farm.vn"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-700">
              Ghi nhớ đăng nhập
            </label>
          </div>

          <Link to="/admin/dashboard">
            <Button type="button" variant="primary" className="w-full mt-6">
              Đăng nhập
            </Button>
          </Link>
        </form>

        {/* Mobile Link */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-2">Bạn là tổ trưởng?</p>
          <Link to="/mobile/login" className="text-sm text-green-600 hover:text-green-700 font-medium">
            Đăng nhập Mobile →
          </Link>
        </div>
      </div>
    </div>
  );
}
