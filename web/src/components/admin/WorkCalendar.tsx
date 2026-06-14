import React from "react";
import { Filter, UserCircle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { tasks, plots } from "../../lib/mockData";

export function WorkCalendar() {
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<any>(null);

  // Generate 10 days
  const startDate = new Date("2026-06-14");
  const days = Array.from({ length: 10 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    return date;
  });

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return tasks.filter(t => t.date === dateStr);
  };

  const openTaskModal = (task: any) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Tất cả vùng</option>
              <option>Vùng A</option>
              <option>Vùng B</option>
            </select>
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Tất cả lô</option>
            {plots.map(p => (
              <option key={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Tất cả tổ trưởng</option>
            <option>Nguyễn Văn A</option>
            <option>Trần Thị B</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Tất cả cây</option>
            <option>Gấc</option>
            <option>Sâm</option>
          </select>
          <Button variant="primary" size="sm">
            Thêm việc thủ công
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="w-4 h-4 mr-1" />
          10 ngày trước
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">
          Lịch công việc 10 ngày (14/06 - 23/06/2026)
        </h3>
        <Button variant="ghost" size="sm">
          10 ngày sau
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* 10-day Calendar Grid */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <div className="flex min-w-[1200px]">
          {days.map((day, idx) => {
            const dayTasks = getTasksForDate(day);
            const isToday = idx === 0;

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-green-50' : ''}`}
              >
                {/* Day Header */}
                <div className={`p-4 border-b border-gray-200 ${isToday ? 'bg-green-600 text-white' : 'bg-gray-50'}`}>
                  <div className="text-center">
                    <div className={`text-xs font-medium ${isToday ? 'text-green-100' : 'text-gray-500'}`}>
                      {day.toLocaleDateString("vi-VN", { weekday: "short" })}
                    </div>
                    <div className={`text-lg font-bold mt-1 ${isToday ? 'text-white' : 'text-gray-900'}`}>
                      {day.getDate()}/{day.getMonth() + 1}
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-2 space-y-2 min-h-[400px]">
                  {dayTasks.map((task) => {
                    const plot = plots.find(p => p.id === task.plotId);
                    return (
                      <button
                        key={task.id}
                        onClick={() => openTaskModal(task)}
                        className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900 line-clamp-2">
                            {task.title}
                          </span>
                          <StatusBadge status={task.status}>
                            {task.status === "completed" ? "✓" :
                             task.status === "in-progress" ? "..." :
                             task.status === "overdue" ? "!" : "○"}
                          </StatusBadge>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>{plot?.name} • {task.crop}</div>
                          <div className="flex items-center gap-1">
                            <UserCircle className="w-3 h-3" />
                            {plot?.teamLeader}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Lô:</span>
                  <span className="ml-2 font-medium">{plots.find(p => p.id === selectedTask.plotId)?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Cây:</span>
                  <span className="ml-2 font-medium">{selectedTask.crop}</span>
                </div>
                <div>
                  <span className="text-gray-600">Ngày:</span>
                  <span className="ml-2 font-medium">{new Date(selectedTask.date).toLocaleDateString("vi-VN")}</span>
                </div>
                <div>
                  <span className="text-gray-600">Trạng thái:</span>
                  <StatusBadge status={selectedTask.status}>
                    {selectedTask.status === "completed" ? "Hoàn thành" :
                     selectedTask.status === "in-progress" ? "Đang làm" :
                     selectedTask.status === "overdue" ? "Quá hạn" : "Chưa làm"}
                  </StatusBadge>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Gán lại tổ trưởng</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option>Nguyễn Văn A</option>
                  <option>Trần Thị B</option>
                  <option>Lê Văn C</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lùi lịch đến ngày</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  defaultValue={selectedTask.date}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowTaskModal(false)}>
                Đóng
              </Button>
              <Button variant="primary" className="flex-1">
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
