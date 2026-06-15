import React from "react";
import { Filter, UserCircle, Calendar, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import {
  tasks,
  plots,
  zones,
  teamLeaders,
  plotName,
  zoneName,
  leaderPlots,
} from "../../lib/mockData";

type TaskStatus = "pending" | "in-progress" | "completed" | "overdue";

const fmtYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtDM = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

const statusLabel = (s: string) =>
  s === "completed"
    ? "Hoàn thành"
    : s === "in-progress"
    ? "Đang làm"
    : s === "overdue"
    ? "Quá hạn"
    : "Chưa làm";

const leaderName = (id: string) =>
  teamLeaders.find((t) => t.id === id)?.name || "—";

export function WorkCalendar() {
  // Bộ lọc nhiều chiều
  const [filterPlot, setFilterPlot] = React.useState<string>("all");
  const [filterLeader, setFilterLeader] = React.useState<string>("all");
  const [filterZone, setFilterZone] = React.useState<string>("all");

  // Điều hướng 10 ngày (cửa sổ). offset = số ngày dịch chuyển từ mốc gốc.
  const baseDate = React.useRef(new Date("2026-06-14")).current;
  const [offset, setOffset] = React.useState(0);

  const startDate = React.useMemo(() => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + offset);
    return d;
  }, [baseDate, offset]);

  const days = React.useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return date;
      }),
    [startDate]
  );

  // Lọc theo lô/tổ trưởng/zone
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (filterPlot !== "all" && t.plotId !== filterPlot) return false;
      if (filterLeader !== "all" && t.teamLeaderId !== filterLeader)
        return false;
      if (filterZone !== "all") {
        const plot = plots.find((p) => p.id === t.plotId);
        if (!plot || plot.zoneId !== filterZone) return false;
      }
      return true;
    });
  }, [filterPlot, filterLeader, filterZone]);

  const getTasksForDate = (date: Date) => {
    const dateStr = fmtYMD(date);
    return filteredTasks.filter((t) => t.date === dateStr);
  };

  // Nhóm việc trong 1 ngày theo lô
  const groupByPlot = (dayTasks: typeof tasks) => {
    const map = new Map<string, typeof tasks>();
    dayTasks.forEach((t) => {
      const arr = map.get(t.plotId) || [];
      arr.push(t);
      map.set(t.plotId, arr);
    });
    return Array.from(map.entries());
  };

  const summarize = (items: typeof tasks) => {
    const total = items.length;
    const done = items.filter((t) => t.status === "completed").length;
    const overdue = items.filter((t) => t.status === "overdue").length;
    const notDone = total - done;
    return { total, done, notDone, overdue };
  };

  // Demo: gán lại / lùi lịch (hệ thống KHÔNG tự đổi lịch — admin chủ động)
  const handleReassign = (task: any) => {
    alert(
      `(Demo) Gán lại việc "${task.title}" — ${plotName(task.plotId)}.\n` +
        `Tổ trưởng hiện tại: ${leaderName(task.teamLeaderId)}.\n` +
        `Hệ thống không tự đổi lịch, admin chủ động chọn tổ trưởng mới.`
    );
  };

  const handlePostpone = (task: any) => {
    alert(
      `(Demo) Lùi lịch việc "${task.title}" — ${plotName(task.plotId)} (ngày ${
        task.date
      }).\n` +
        `Hệ thống không tự đổi lịch ngày sau, admin chủ động chọn ngày mới.`
    );
  };

  // Tổng quan khi lọc theo 1 tổ trưởng
  const todayStr = fmtYMD(days[0]);
  const leaderOverview = React.useMemo(() => {
    if (filterLeader === "all") return null;
    const myPlots = leaderPlots(filterLeader);
    const totalPlots = myPlots.length;
    const donePlotsToday = myPlots.filter((p) => {
      const plotTasksToday = tasks.filter(
        (t) => t.plotId === p.id && t.date === todayStr
      );
      if (!plotTasksToday.length) return false;
      return plotTasksToday.every((t) => t.status === "completed");
    }).length;
    return {
      name: leaderName(filterLeader),
      totalPlots,
      donePlotsToday,
    };
  }, [filterLeader, todayStr]);

  const rangeLabel = `${fmtDM(days[0])} - ${fmtDM(days[9])}/${days[9].getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Bộ lọc nhiều chiều */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter className="w-5 h-5" />
            <span className="text-sm font-medium">Bộ lọc</span>
          </div>

          {/* Lọc theo Zone */}
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">Tất cả vùng</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          {/* Lọc theo Lô */}
          <select
            value={filterPlot}
            onChange={(e) => setFilterPlot(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">Tất cả lô</option>
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({zoneName(p.zoneId)})
              </option>
            ))}
          </select>

          {/* Lọc theo Tổ trưởng */}
          <select
            value={filterLeader}
            onChange={(e) => setFilterLeader(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">Tất cả tổ trưởng</option>
            {teamLeaders.map((tl) => (
              <option key={tl.id} value={tl.id}>
                {tl.name}
              </option>
            ))}
          </select>

          {(filterZone !== "all" ||
            filterPlot !== "all" ||
            filterLeader !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterZone("all");
                setFilterPlot("all");
                setFilterLeader("all");
              }}
            >
              Xóa lọc
            </Button>
          )}

          <Button variant="primary" size="sm" className="ml-auto">
            Thêm việc thủ công
          </Button>
        </div>

        {/* Tổng quan tổ trưởng khi lọc theo 1 tổ trưởng */}
        {leaderOverview && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
            <UserCircle className="w-4 h-4" />
            <span className="font-medium">{leaderOverview.name}:</span>
            <span>
              Đang phụ trách {leaderOverview.totalPlots} lô · Đã hoàn thành{" "}
              {leaderOverview.donePlotsToday}/{leaderOverview.totalPlots} lô hôm
              nay
            </span>
          </div>
        )}
      </div>

      {/* Điều hướng */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOffset((o) => o - 10)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          10 ngày trước
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOffset((o) => o - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Ngày trước
          </Button>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Calendar className="w-5 h-5 text-green-600" />
            Lịch công việc 10 ngày ({rangeLabel})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOffset((o) => o + 1)}
          >
            Ngày sau
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOffset((o) => o + 10)}
        >
          10 ngày sau
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <p className="text-xs text-gray-500 italic">
        Lưu ý: Hệ thống không tự đổi lịch ngày sau — admin chủ động gán lại / lùi
        lịch từng việc.
      </p>

      {/* Danh sách theo ngày → nhóm theo lô */}
      <div className="space-y-4">
        {days.map((day, idx) => {
          const dayTasks = getTasksForDate(day);
          const isToday = idx === 0;
          const grouped = groupByPlot(dayTasks);

          return (
            <div
              key={day.toISOString()}
              className={`bg-white rounded-lg shadow border ${
                isToday ? "border-green-300" : "border-gray-200"
              }`}
            >
              {/* Header ngày */}
              <div
                className={`flex items-center justify-between px-4 py-3 rounded-t-lg ${
                  isToday ? "bg-green-600 text-white" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isToday ? "text-green-100" : "text-gray-500"
                    }`}
                  >
                    {day.toLocaleDateString("vi-VN", { weekday: "long" })}
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      isToday ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {fmtDM(day)}
                  </span>
                  {isToday && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      Hôm nay
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isToday ? "text-green-100" : "text-gray-500"
                  }`}
                >
                  {dayTasks.length} việc · {grouped.length} lô
                </span>
              </div>

              {/* Nội dung */}
              <div className="p-4 space-y-4">
                {grouped.length === 0 && (
                  <div className="text-sm text-gray-400 italic">
                    Không có công việc
                  </div>
                )}

                {grouped.map(([plotId, plotTasks]) => {
                  const plot = plots.find((p) => p.id === plotId);
                  const s = summarize(plotTasks);
                  return (
                    <div
                      key={plotId}
                      className="rounded-lg border border-gray-200"
                    >
                      {/* Header lô + tổng kết */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-900">
                            {plotName(plotId)}
                          </span>
                          {plot && (
                            <span className="text-xs text-gray-500">
                              {zoneName(plot.zoneId)} · {plot.crop}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          Tổng {s.total} ·{" "}
                          <span className="text-green-700 font-medium">
                            Xong {s.done}
                          </span>{" "}
                          ·{" "}
                          <span className="text-gray-700 font-medium">
                            Chưa {s.notDone}
                          </span>{" "}
                          ·{" "}
                          <span className="text-red-700 font-medium">
                            Quá hạn {s.overdue}
                          </span>
                        </div>
                      </div>

                      {/* Danh sách việc của lô */}
                      <div className="divide-y divide-gray-100">
                        {plotTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {task.title}
                                </span>
                                <StatusBadge
                                  status={task.status as TaskStatus}
                                >
                                  {statusLabel(task.status)}
                                </StatusBadge>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                                <span>{task.crop}</span>
                                <span className="flex items-center gap-1">
                                  <UserCircle className="w-3 h-3" />
                                  {leaderName(task.teamLeaderId)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleReassign(task)}
                              >
                                Gán lại
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePostpone(task)}
                              >
                                Lùi lịch
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
