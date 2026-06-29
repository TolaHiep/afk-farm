import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  ClipboardList,
  Layers,
  Send,
  TrendingUp,
} from "lucide-react";
import { getTodayTasks, getMyPlots } from "../../lib/queries";
import { queuedTaskIds } from "../../lib/offline";
import { todayYMD } from "../../lib/today";

const TODAY = todayYMD();

// Định dạng ngày kiểu Việt Nam (Thứ X, dd tháng MM, yyyy)
function formatVNDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const weekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return `${weekdays[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

// Cộng ngày vào chuỗi "YYYY-MM-DD" — dùng UTC để không lệch múi giờ
// (toISOString() trên Date local sẽ trừ +07:00 ra → lệch 1 ngày khi setDate/getDate trên VN).
function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Chip + màu trạng thái việc
function statusChip(status: string) {
  switch (status) {
    case "completed":
      return { cls: "bg-green-100 text-green-700", label: "Hoàn thành", dot: "bg-green-500" };
    case "in-progress":
      return { cls: "bg-blue-100 text-blue-700", label: "Đang làm", dot: "bg-blue-500" };
    case "overdue":
      return { cls: "bg-red-100 text-red-700", label: "Quá hạn", dot: "bg-red-500" };
    default:
      return { cls: "bg-gray-100 text-gray-600", label: "Chưa làm", dot: "bg-gray-400" };
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case "in-progress":
      return <Clock className="w-5 h-5 text-blue-600" />;
    case "overdue":
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    default:
      return <Circle className="w-5 h-5 text-gray-400" />;
  }
}

// Mô hình xen canh: Gấc leo giàn (tầng trên) + Sâm dưới tán (tầng dưới).
// Mỗi cây có nhãn tầng + màu badge riêng để tổ trưởng phân biệt nhanh.
function cropMeta(crop: string) {
  switch (crop) {
    case "Gấc":
      return { label: "Gấc (giàn)", layer: "tầng giàn", cls: "bg-emerald-100 text-emerald-800" };
    case "Sâm":
      return { label: "Sâm (dưới tán)", layer: "dưới tán", cls: "bg-amber-100 text-amber-800" };
    default:
      return { label: crop, layer: "", cls: "bg-gray-100 text-gray-700" };
  }
}

// Thứ tự hiển thị cây trong lô: Gấc (tầng trên) trước, Sâm (tầng dưới) sau
const CROP_ORDER = ["Gấc", "Sâm"];

export function TodayTasks() {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(TODAY);
  const [dayTasks, setDayTasks] = useState<any[]>([]);
  const [myPlots, setMyPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const isToday = viewDate === TODAY;

  // Nạp danh sách lô thật 1 lần để tra tên/cây theo plotId
  useEffect(() => {
    getMyPlots()
      .then((plots) => setMyPlots(plots))
      .catch(() => setMyPlots([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    getTodayTasks(viewDate).then((tasks) => {
      // Phủ trạng thái: việc đã hoàn thành offline (đang chờ đồng bộ) hiện 'completed' ngay
      const queued = queuedTaskIds();
      setDayTasks(tasks.map((t) => (queued.has(String(t.id)) ? { ...t, status: "completed" } : t)));
      setLoading(false);
    }).catch(() => {
      setDayTasks([]);
      setLoading(false);
    });
  }, [viewDate]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Đang tải…</div>;
  }

  // Nhóm việc theo lô, rồi trong mỗi lô nhóm tiếp theo cây (Gấc / Sâm) — mô hình xen canh
  const plotGroups = Array.from(new Set(dayTasks.map((t) => t.plotId))).map((plotId) => {
    const plot = myPlots.find((p) => p.id === plotId);
    const items = dayTasks.filter((t) => t.plotId === plotId);
    const done = items.filter((t) => t.status === "completed").length;

    // Nhóm con theo cây, sắp xếp Gấc (tầng trên) trước, Sâm (tầng dưới) sau
    const cropNames = Array.from(new Set(items.map((t) => t.crop))).sort(
      (a, b) => (CROP_ORDER.indexOf(a) + 1 || 99) - (CROP_ORDER.indexOf(b) + 1 || 99)
    );
    const cropGroups = cropNames.map((crop) => {
      const cropItems = items.filter((t) => t.crop === crop);
      return {
        crop,
        items: cropItems,
        done: cropItems.filter((t) => t.status === "completed").length,
        total: cropItems.length,
      };
    });

    return {
      plotId,
      name: plot?.name || plotId,
      crop: plot?.crop || items[0]?.crop || "",
      items,
      cropGroups,
      done,
      total: items.length,
      finished: items.length > 0 && items.every((t) => t.status === "completed"),
    };
  });

  // Thống kê tổng quan
  const totalTasks = dayTasks.length;
  const doneTasks = dayTasks.filter((t) => t.status === "completed").length;
  const totalPlots = plotGroups.length;
  const donePlots = plotGroups.filter((g) => g.finished).length;
  // Giả lập báo cáo: lô có >=1 việc completed coi như đã gửi báo cáo
  const reportedPlots = plotGroups.filter((g) => g.done >= 1).length;
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const allDone = totalTasks > 0 && doneTasks === totalTasks;

  return (
    <div className="p-4 space-y-4">
      {/* Bộ chọn ngày */}
      <div className="bg-white rounded-xl p-4 shadow flex items-center justify-between">
        <button
          onClick={() => setViewDate(addDays(viewDate, -1))}
          className="p-2 rounded-lg bg-gray-100 active:bg-gray-200"
          aria-label="Ngày trước"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">
            {isToday ? "Việc hôm nay" : "Xem lại ngày"}
          </h2>
          <p className="text-sm text-gray-600">{formatVNDate(viewDate)}</p>
        </div>
        <button
          onClick={() => setViewDate(addDays(viewDate, 1))}
          disabled={isToday}
          className="p-2 rounded-lg bg-gray-100 active:bg-gray-200 disabled:opacity-40"
          aria-label="Ngày sau"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Banner hoàn thành 100% */}
      {allDone && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-center gap-3 shadow">
          <CheckCircle className="w-10 h-10 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800">Ngày hôm nay bạn đã hoàn thành hết việc.</p>
            <p className="text-sm text-green-700">Hoàn thành 100%. Tuyệt vời.</p>
          </div>
        </div>
      )}

      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <ClipboardList className="w-4 h-4" />
            <span className="text-xs font-medium">Việc hoàn thành</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {doneTasks}
            <span className="text-base font-medium text-gray-400">/{totalTasks}</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium">Lô hoàn thành</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {donePlots}
            <span className="text-base font-medium text-gray-400">/{totalPlots}</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Send className="w-4 h-4" />
            <span className="text-xs font-medium">Báo cáo đã gửi</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {reportedPlots}
            <span className="text-base font-medium text-gray-400">/{totalPlots}</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Tỷ lệ hoàn thành</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/mobile/upcoming")}
          className="bg-blue-600 text-white rounded-xl p-4 flex flex-col items-center justify-center shadow active:bg-blue-700"
        >
          <Calendar className="w-7 h-7 mb-1" />
          <span className="font-semibold">Các ngày tới</span>
        </button>
        <button
          onClick={() => navigate("/mobile/report")}
          className="bg-green-600 text-white rounded-xl p-4 flex flex-col items-center justify-center shadow active:bg-green-700"
        >
          <FileText className="w-7 h-7 mb-1" />
          <span className="font-semibold">Báo cáo cuối ngày</span>
        </button>
      </div>
      <button
        onClick={() => navigate("/mobile/support")}
        className="w-full bg-white border border-orange-300 text-orange-700 rounded-xl p-3 flex items-center justify-center gap-2 shadow active:bg-orange-50"
      >
        <LifeBuoy className="w-5 h-5" />
        <span className="font-semibold">Yêu cầu hỗ trợ</span>
      </button>

      {/* Phân việc theo lô */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900 px-1">Phân việc theo lô</h3>
        {plotGroups.map((group) => {
          const pct = group.total ? Math.round((group.done / group.total) * 100) : 0;
          return (
            <div key={group.plotId} className="bg-white rounded-xl shadow overflow-hidden">
              {/* Tiêu đề lô + tiến độ */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-bold text-gray-900 truncate min-w-0">
                    {group.name} · {group.crop}
                  </h4>
                  <span
                    className={`flex-shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-1 rounded-full ${
                      group.finished
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {group.done}/{group.total} việc
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      group.finished ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Việc trong lô, nhóm theo cây (Gấc giàn / Sâm dưới tán) */}
              <div className="divide-y divide-gray-100">
                {group.cropGroups.map((cg) => {
                  const meta = cropMeta(cg.crop);
                  return (
                    <div key={cg.crop}>
                      {/* Tiêu đề nhóm cây + badge cây + tiến độ riêng của cây */}
                      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-gray-50">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          {cg.done}/{cg.total} việc
                        </span>
                      </div>

                      {/* Danh sách việc của cây này */}
                      <div className="divide-y divide-gray-100">
                        {cg.items.map((task) => {
                          const chip = statusChip(task.status);
                          return (
                            <button
                              key={task.id}
                              onClick={() => navigate(`/mobile/task/${task.id}`)}
                              className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50"
                            >
                              <div className="flex-shrink-0">{statusIcon(task.status)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{task.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${chip.cls}`}
                                  >
                                    {chip.label}
                                  </span>
                                  {task.requirePhoto && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                      Cần ảnh
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {plotGroups.length === 0 && (
          <div className="bg-white rounded-xl shadow text-center py-12">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">Không có việc trong ngày này</p>
            <p className="text-gray-500 mt-1">Hãy chọn ngày khác để xem.</p>
          </div>
        )}
      </div>
    </div>
  );
}
