import React, { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { tasks, plotName } from "../../lib/mockData";

const TODAY = "2026-06-14";

type RangeKey = "1" | "3" | "7" | "10";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "1", label: "Ngày mai" },
  { key: "3", label: "3 ngày tới" },
  { key: "7", label: "7 ngày tới" },
  { key: "10", label: "10 ngày tới" },
];

// Cộng số ngày vào chuỗi "YYYY-MM-DD" (tránh lệch múi giờ bằng cách dùng UTC)
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function getStatusChip(status: string): { label: string; cls: string } {
  switch (status) {
    case "completed":
      return { label: "Hoàn thành", cls: "bg-green-100 text-green-800" };
    case "in-progress":
      return { label: "Đang làm", cls: "bg-blue-100 text-blue-800" };
    case "overdue":
      return { label: "Quá hạn", cls: "bg-red-100 text-red-800" };
    default:
      return { label: "Chưa làm", cls: "bg-gray-100 text-gray-700" };
  }
}

function formatDate(dateStr: string): { dayOfWeek: string; day: number; month: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return { dayOfWeek: days[dt.getUTCDay()], day: d, month: m };
}

export function UpcomingTasks() {
  const [range, setRange] = useState<RangeKey>("10");

  // Giới hạn cuối theo khoảng đã chọn (tối đa 10 ngày tới)
  const rangeEnd = addDays(TODAY, Number(range));

  // Lọc: công việc của tl1, date > hôm nay và <= giới hạn khoảng
  const filtered = tasks
    .filter(
      (t) =>
        t.teamLeaderId === "tl1" &&
        t.date > TODAY &&
        t.date <= rangeEnd
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Nhóm theo ngày -> theo lô
  const byDate: Record<string, Record<string, typeof tasks>> = {};
  for (const t of filtered) {
    if (!byDate[t.date]) byDate[t.date] = {};
    if (!byDate[t.date][t.plotId]) byDate[t.date][t.plotId] = [];
    byDate[t.date][t.plotId].push(t);
  }
  const sortedDates = Object.keys(byDate).sort((a, b) => a.localeCompare(b));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/mobile/tasks" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Công việc sắp tới</h2>
      </div>

      {/* Bộ chọn thời gian */}
      <div className="bg-white rounded-xl p-3 shadow">
        <p className="text-sm font-medium text-gray-600 mb-2">Khoảng thời gian</p>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRange(opt.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                range === opt.key
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách nhóm theo ngày -> lô */}
      {sortedDates.length > 0 ? (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const plotsOfDate = byDate[date];
            const { dayOfWeek, day, month } = formatDate(date);
            const totalTasks = Object.values(plotsOfDate).reduce(
              (s, arr) => s + arr.length,
              0
            );

            return (
              <div
                key={date}
                className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden"
              >
                {/* Tiêu đề ngày */}
                <div className="bg-green-600 text-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">{dayOfWeek}</p>
                    <p className="text-2xl font-bold">
                      {day}/{month}
                    </p>
                  </div>
                  <div className="bg-white text-green-600 rounded-full px-3 py-1 font-bold">
                    {totalTasks} việc
                  </div>
                </div>

                {/* Nhóm theo lô */}
                <div className="p-4 space-y-4">
                  {Object.keys(plotsOfDate).map((plotId) => (
                    <div key={plotId}>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span>{plotName(plotId)}</span>
                      </div>
                      <div className="space-y-2 pl-1">
                        {plotsOfDate[plotId].map((task) => {
                          const chip = getStatusChip(task.status);
                          return (
                            <Link
                              key={task.id}
                              to={`/mobile/task/${task.id}`}
                              className="block bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-gray-900">
                                    {task.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    Cây: {task.crop}
                                  </p>
                                </div>
                                <span
                                  className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${chip.cls}`}
                                >
                                  {chip.label}
                                </span>
                              </div>
                              {task.requirePhoto && (
                                <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  Cần chụp ảnh
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">
            Không có công việc sắp tới
          </p>
          <p className="text-gray-600 mt-1">
            Trong khoảng đã chọn chưa có công việc nào.
          </p>
        </div>
      )}
    </div>
  );
}
