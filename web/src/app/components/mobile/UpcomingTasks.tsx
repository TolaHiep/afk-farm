import React from "react";
import { Link } from "react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { tasks, plots } from "../../lib/mockData";

export function UpcomingTasks() {
  const upcomingDates = ["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19"];
  
  const getTasksForDate = (date: string) => {
    return tasks.filter(t => t.date === date && t.teamLeaderId === "tl1");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const dayOfWeek = days[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return { dayOfWeek, day, month };
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/mobile/tasks" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Các ngày sắp tới</h2>
      </div>

      {/* Upcoming Tasks by Date */}
      <div className="space-y-4">
        {upcomingDates.map((date) => {
          const dateTasks = getTasksForDate(date);
          const { dayOfWeek, day, month } = formatDate(date);

          return (
            <div key={date} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {/* Date Header */}
              <div className="bg-green-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">{dayOfWeek}</p>
                    <p className="text-2xl font-bold">{day}/{month}</p>
                  </div>
                  <div className="bg-white text-green-600 rounded-full px-3 py-1 font-bold">
                    {dateTasks.length} việc
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="p-4 space-y-3">
                {dateTasks.length > 0 ? (
                  dateTasks.map((task) => {
                    const plot = plots.find(p => p.id === task.plotId);
                    return (
                      <Link
                        key={task.id}
                        to={`/mobile/task/${task.id}`}
                        className="block bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100"
                      >
                        <h3 className="font-bold text-gray-900 mb-2">{task.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{plot?.name} • {task.crop}</span>
                        </div>
                        {task.requirePhoto && (
                          <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Cần chụp ảnh
                          </span>
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 py-4">Không có công việc</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
