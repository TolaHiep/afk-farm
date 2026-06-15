import React from "react";
import { Filter, UserCircle, Calendar, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import { tasks, plots, zones, teamLeaders, plotName, zoneName, leaderPlots } from "../../lib/mockData";

type TaskStatus = "pending" | "in-progress" | "completed" | "overdue";

const TODAY = new Date("2026-06-14");
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const fmtYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const statusLabel = (s: string) =>
  s === "completed" ? "Hoàn thành" : s === "in-progress" ? "Đang làm" : s === "overdue" ? "Quá hạn" : "Chưa làm";
const leaderName = (id: string) => teamLeaders.find((t) => t.id === id)?.name || "—";

export function WorkCalendar() {
  const [filterPlot, setFilterPlot] = React.useState("all");
  const [filterLeader, setFilterLeader] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState("all");

  const [viewMonth, setViewMonth] = React.useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selectedDay, setSelectedDay] = React.useState<Date>(TODAY);

  const filteredTasks = React.useMemo(
    () =>
      tasks.filter((t) => {
        if (filterPlot !== "all" && t.plotId !== filterPlot) return false;
        if (filterLeader !== "all" && t.teamLeaderId !== filterLeader) return false;
        if (filterZone !== "all") {
          const plot = plots.find((p) => p.id === t.plotId);
          if (!plot || plot.zoneId !== filterZone) return false;
        }
        return true;
      }),
    [filterPlot, filterLeader, filterZone]
  );

  const tasksOn = (d: Date) => filteredTasks.filter((t) => t.date === fmtYMD(d));

  // 42 ô lịch (6 tuần), bắt đầu từ Thứ Hai
  const cells = React.useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // 0=T2
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const groupByPlot = (dayTasks: typeof tasks) => {
    const map = new Map<string, typeof tasks>();
    dayTasks.forEach((t) => { const a = map.get(t.plotId) || []; a.push(t); map.set(t.plotId, a); });
    return Array.from(map.entries());
  };
  const summarize = (items: typeof tasks) => ({
    total: items.length,
    done: items.filter((t) => t.status === "completed").length,
    overdue: items.filter((t) => t.status === "overdue").length,
    notDone: items.length - items.filter((t) => t.status === "completed").length,
  });

  const handleReassign = (task: any) => alert(`(Demo) Gán lại việc "${task.title}" — ${plotName(task.plotId)}. Admin chủ động chọn tổ trưởng mới.`);
  const handlePostpone = (task: any) => alert(`(Demo) Lùi lịch việc "${task.title}" — ${plotName(task.plotId)} (ngày ${task.date}). Admin chủ động chọn ngày mới.`);

  const leaderOverview = React.useMemo(() => {
    if (filterLeader === "all") return null;
    const myPlots = leaderPlots(filterLeader);
    const donePlotsToday = myPlots.filter((p) => {
      const t = tasks.filter((x) => x.plotId === p.id && x.date === fmtYMD(TODAY));
      return t.length > 0 && t.every((x) => x.status === "completed");
    }).length;
    return { name: leaderName(filterLeader), totalPlots: myPlots.length, donePlotsToday };
  }, [filterLeader]);

  const monthLabel = `Tháng ${viewMonth.getMonth() + 1}/${viewMonth.getFullYear()}`;
  const selTasks = tasksOn(selectedDay);
  const selGrouped = groupByPlot(selTasks);

  return (
    <div className="space-y-6">
      {/* Bộ lọc */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500"><Filter className="w-5 h-5" /><span className="text-sm font-medium">Bộ lọc</span></div>
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto">
            <option value="all">Tất cả vùng</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <select value={filterPlot} onChange={(e) => setFilterPlot(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto">
            <option value="all">Tất cả lô</option>
            {plots.map((p) => <option key={p.id} value={p.id}>{p.name} ({zoneName(p.zoneId)})</option>)}
          </select>
          <select value={filterLeader} onChange={(e) => setFilterLeader(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto">
            <option value="all">Tất cả tổ trưởng</option>
            {teamLeaders.map((tl) => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
          </select>
          {(filterZone !== "all" || filterPlot !== "all" || filterLeader !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterZone("all"); setFilterPlot("all"); setFilterLeader("all"); }}>Xóa lọc</Button>
          )}
        </div>
        {leaderOverview && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
            <UserCircle className="w-4 h-4" />
            <span className="font-medium">{leaderOverview.name}:</span>
            <span>Đang phụ trách {leaderOverview.totalPlots} lô · Đã hoàn thành {leaderOverview.donePlotsToday}/{leaderOverview.totalPlots} lô hôm nay</span>
          </div>
        )}
      </div>

      {/* Lịch tháng */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Calendar className="w-5 h-5 text-green-600" /> {monthLabel}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setViewMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)); setSelectedDay(TODAY); }}>Hôm nay</Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tên thứ */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => <div key={w} className="text-center text-xs font-medium text-gray-500 py-1">{w}</div>)}
        </div>

        {/* Ô ngày */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const isToday = sameDay(d, TODAY);
            const isSel = sameDay(d, selectedDay);
            const dt = tasksOn(d);
            const overdue = dt.some((t) => t.status === "overdue");
            const allDone = dt.length > 0 && dt.every((t) => t.status === "completed");
            const countCls = overdue ? "bg-red-100 text-red-700" : allDone ? "bg-green-100 text-green-700" : dt.length ? "bg-amber-100 text-amber-700" : "";
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDay(new Date(d))}
                className={`min-h-[58px] sm:min-h-[80px] rounded-lg border p-1 sm:p-2 text-left transition flex flex-col
                  ${inMonth ? "bg-white" : "bg-gray-50"}
                  ${isSel ? "border-green-500 ring-2 ring-green-500" : isToday ? "border-green-400" : "border-gray-200"}
                  hover:border-green-400`}
              >
                <span className={`text-xs sm:text-sm font-medium ${isToday ? "text-green-600 font-bold" : inMonth ? "text-gray-800" : "text-gray-400"}`}>
                  {d.getDate()}
                </span>
                {dt.length > 0 && (
                  <span className={`mt-auto self-start text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full ${countCls}`}>
                    {dt.length} việc
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Chú thích */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300" /> Có việc chưa xong</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-300" /> Đã xong hết</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300" /> Có việc quá hạn</span>
        </div>
      </div>

      {/* Chi tiết ngày đang chọn */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-base font-semibold text-gray-900">
            {selectedDay.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}
            {sameDay(selectedDay, TODAY) && <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Hôm nay</span>}
          </h3>
          <span className="text-sm text-gray-600">{selTasks.length} việc · {selGrouped.length} lô</span>
        </div>

        <div className="p-4 space-y-4">
          {selGrouped.length === 0 && <div className="text-sm text-gray-400 italic py-6 text-center">Không có công việc trong ngày này</div>}
          {selGrouped.map(([plotId, plotTasks]) => {
            const plot = plots.find((p) => p.id === plotId);
            const s = summarize(plotTasks);
            return (
              <div key={plotId} className="rounded-lg border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-900">{plotName(plotId)}</span>
                    {plot && <span className="text-xs text-gray-500">{zoneName(plot.zoneId)} · {plot.crop}</span>}
                  </div>
                  <div className="text-xs text-gray-600">
                    Tổng {s.total} · <span className="text-green-700 font-medium">Xong {s.done}</span> · <span className="text-gray-700 font-medium">Chưa {s.notDone}</span> · <span className="text-red-700 font-medium">Quá hạn {s.overdue}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {plotTasks.map((task) => (
                    <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{task.title}</span>
                          <StatusBadge status={task.status as TaskStatus}>{statusLabel(task.status)}</StatusBadge>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                          <span>{task.crop}</span>
                          <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" />{leaderName(task.teamLeaderId)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleReassign(task)}>Gán lại</Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePostpone(task)}>Lùi lịch</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
