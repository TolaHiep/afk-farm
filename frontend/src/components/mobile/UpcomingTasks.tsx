import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowLeft, MapPin, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { getUpcomingTasks, getMyPlots } from "../../lib/queries";
import { todayYMD } from "../../lib/today";

const TODAY = todayYMD();

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

// Nhãn màu cho từng tầng cây (mô hình xen canh: Gấc tầng giàn + Sâm dưới tán)
function getCropChip(crop: string): string {
  switch (crop) {
    case "Gấc":
      return "bg-orange-100 text-orange-800";
    case "Sâm":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

// Thứ tự hiển thị cây: Gấc (tầng trên) trước, Sâm (tầng dưới) sau
function cropOrder(crop: string): number {
  return crop === "Gấc" ? 0 : crop === "Sâm" ? 1 : 2;
}

export function UpcomingTasks() {
  const [range, setRange] = useState<RangeKey>("10");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Ngày bị thu gọn (ẩn danh sách việc) — bấm tiêu đề ngày để mở/đóng
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleDate = (date: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  // Map plotId -> tên lô thật (lấy từ API)
  const [plotNames, setPlotNames] = useState<Record<string, string>>({});

  useEffect(() => {
    getMyPlots()
      .then((plots) => {
        const map: Record<string, string> = {};
        for (const p of plots) map[p.id] = p.name;
        setPlotNames(map);
      })
      .catch(() => setPlotNames({}));
  }, []);

  useEffect(() => {
    setLoading(true);
    getUpcomingTasks(TODAY, Number(range))
      .then((data) => setTasks(data))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Đang tải…</div>;
  }

  // Giới hạn cuối theo khoảng đã chọn (tối đa 10 ngày tới)
  const rangeEnd = addDays(TODAY, Number(range));

  // Lọc: date > hôm nay và <= giới hạn khoảng (backend scopes to session user)
  const filtered = tasks
    .filter((t) => t.date > TODAY && t.date <= rangeEnd)
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
                {/* Tiêu đề ngày — bấm để thu gọn/mở */}
                <button
                  type="button"
                  onClick={() => toggleDate(date)}
                  className="w-full bg-green-600 text-white p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    {collapsed.has(date) ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    <div>
                      <p className="text-sm opacity-90">{dayOfWeek}</p>
                      <p className="text-2xl font-bold">
                        {day}/{month}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white text-green-600 rounded-full px-3 py-1 font-bold">
                    {totalTasks} việc
                  </div>
                </button>

                {/* Nhóm theo lô -> nhóm con theo cây */}
                {!collapsed.has(date) && (
                <div className="p-4 space-y-4">
                  {Object.keys(plotsOfDate).map((plotId) => {
                    // Gom việc trong lô theo từng cây (tầng giàn Gấc / dưới tán Sâm)
                    const tasksOfPlot = plotsOfDate[plotId];
                    const crops = Array.from(
                      new Set(tasksOfPlot.map((t) => t.crop))
                    ).sort((a, b) => cropOrder(a) - cropOrder(b));

                    return (
                      <div key={plotId}>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span>{plotNames[plotId] || plotId}</span>
                        </div>
                        <div className="space-y-3 pl-1">
                          {crops.map((crop) => (
                            <div key={crop}>
                              {/* Nhãn cây (tầng cây) */}
                              <div className="mb-2">
                                <span
                                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${getCropChip(
                                    crop
                                  )}`}
                                >
                                  Cây: {crop}
                                </span>
                              </div>
                              <div className="space-y-2 pl-1">
                                {tasksOfPlot
                                  .filter((t) => t.crop === crop)
                                  .map((task) => {
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
                                            <span
                                              className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${getCropChip(
                                                task.crop
                                              )}`}
                                            >
                                              {task.crop}
                                            </span>
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
                )}
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
