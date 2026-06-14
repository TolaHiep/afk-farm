import React from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { cropCycles, plots, processes } from "../../lib/mockData";

export function CropCycleManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý chu kỳ cây trồng</h2>
          <p className="text-gray-600 mt-1">Khai báo và theo dõi chu kỳ canh tác của từng lô</p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Thêm chu kỳ mới
        </Button>
      </div>

      {/* Crop Cycles Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lô</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cây trồng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày bắt đầu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quy trình</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiến độ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cropCycles.map((cycle) => {
                const plot = plots.find(p => p.id === cycle.plotId);
                const process = processes.find(p => p.id === cycle.processId);
                const startDate = new Date(cycle.startDate);
                const today = new Date("2026-06-14");
                const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const progress = Math.min(Math.round((daysElapsed / 90) * 100), 100);

                return (
                  <tr key={cycle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{plot?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{cycle.crop}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(cycle.startDate).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{process?.name}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={cycle.status}>Đang hoạt động</StatusBadge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">Chi tiết</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Lưu ý</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Một lô có thể có nhiều chu kỳ cây trồng song song (ví dụ: cả Gấc và Sâm)</li>
          <li>• Hệ thống sẽ tự động sinh công việc theo quy trình đã chọn</li>
          <li>• Chu kỳ có thể được tạm dừng hoặc kết thúc sớm nếu cần</li>
        </ul>
      </div>
    </div>
  );
}
