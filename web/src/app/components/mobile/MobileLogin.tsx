import React from "react";
import { Link } from "react-router";
import { Sprout } from "lucide-react";

export function MobileLogin() {
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
        <form className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-base font-semibold text-gray-700 mb-2">
              Tài khoản
            </label>
            <input
              type="text"
              id="username"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg"
              placeholder="Nhập tài khoản"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-semibold text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg"
              placeholder="Nhập mật khẩu"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="remember" className="ml-3 text-base text-gray-700">
              Nhớ đăng nhập
            </label>
          </div>

          <Link to="/mobile/tasks" className="block">
            <button
              type="button"
              className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors mt-6"
            >
              Đăng nhập
            </button>
          </Link>
        </form>
      </div>

      {/* Admin Link */}
      <Link to="/" className="mt-8 text-white text-base hover:text-green-100">
        ← Quay lại trang Admin
      </Link>
    </div>
  );
}
