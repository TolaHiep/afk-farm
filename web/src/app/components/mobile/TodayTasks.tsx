import React from "react";
import { Link } from "react-router";
import { Calendar, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { tasks, plots } from "../../lib/mockData";

export function TodayTasks() {
  const today = "2026-06-14";
  const todayTasks = tasks.filter(t => t.date === today && t.teamLeaderId === "tl1");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 border-green-300 text-green-800";
      case "in-progress": return "bg-blue-100 border-blue-300 text-blue-800";
      case "overdue": return "bg-red-100 border-red-300 text-red-800";
      default: return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "in-progress": return <Clock className="w-6 h-6 text-blue-600" />;
      case "overdue": return <AlertCircle className="w-6 h-6 text-red-600" />;
      default: return <Clock className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Hoàn thành";
      case "in-progress": return "Đang làm";
      case "overdue": return "Quá hạn";
      default: return "Chưa làm";
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Date Header */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="text-2xl font-bold text-gray-900">Công việc hôm nay</h2>
        <p className="text-gray-600 mt-1">Thứ 7, 14 tháng 6, 2026</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/mobile/upcoming" className="bg-blue-600 text-white rounded-lg p-4 flex flex-col items-center justify-center shadow hover:bg-blue-700">
          <Calendar className="w-8 h-8 mb-2" />
          <span className="font-semibold">Các ngày tới</span>
        </Link>
        <Link to="/mobile/report" className="bg-green-600 text-white rounded-lg p-4 flex flex-col items-center justify-center shadow hover:bg-green-700">
          <FileText className="w-8 h-8 mb-2" />
          <span className="font-semibold">Báo cáo cuối ngày</span>
        </Link>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {todayTasks.map((task) => {
          const plot = plots.find(p => p.id === task.plotId);
          return (
            <Link
              key={task.id}
              to={`/mobile/task/${task.id}`}
              className={`block rounded-xl border-2 p-4 shadow ${getStatusColor(task.status)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {task.title}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Lô:</span> {plot?.name}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Cây:</span> {task.crop}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {getStatusText(task.status)}
                    </span>
                    {task.requirePhoto && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Cần ảnh
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {todayTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Không có công việc hôm nay</p>
          <p className="text-gray-600 mt-1">Bạn đã hoàn thành tất cả!</p>
        </div>
      )}
    </div>
  );
}
