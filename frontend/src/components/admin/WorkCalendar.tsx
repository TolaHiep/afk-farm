import React from "react";
import { Filter, UserCircle, Calendar, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import { getCalendar, getPlots, getZones, getTeamLeaders, rescheduleTask, reassignTask } from "../../lib/queries";
import { todayYMD } from "../../lib/today";

type TaskStatus = "pending" | "in-progress" | "completed" | "overdue";
type Task = { id: string; title: string; plotId: string; crop: string; date: string; status: string; teamLeaderId: string; requirePhoto?: boolean; priority?: string };

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const FROM_DATE = todayYMD();
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const fmtYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const statusLabel = (s: string) =>
  s === "completed" ? "Hoàn thành" : s === "in-progress" ? "Đang làm" : s === "overdue" ? "Quá hạn" : "Chưa làm";

export function WorkCalendar() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [plots, setPlots] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);
  const [teamLeaders, setTeamLeaders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");

  const reloadCalendar = React.useCallback(async () => {
    const t = await getCalendar(FROM_DATE, 10);
    setTasks((t as Task[]) ?? []);
  }, []);

  React.useEffect(() => {
    Promise.all([getCalendar(FROM_DATE, 10), getPlots(), getZones(), getTeamLeaders()])
      .then(([t, p, z, tl]) => {
        setTasks((t as Task[]) ?? []);
        setPlots((p as any[]) ?? []);
        setZones((z as any[]) ?? []);
        setTeamLeaders((tl as any[]) ?? []);
      })
      .catch(() => setLoadError("Không tải được lịch công việc từ máy chủ"))
      .finally(() => setLoading(false));
  }, []);

  // Helpers dựa trên dữ liệu đã tải (thay cho helper trong mockData)
  const plotName = (plotId: string) => plots.find((p) => p.id === plotId)?.name || plotId;
  const zoneName = (zoneId: string) => zones.find((z) => z.id === zoneId)?.name || zoneId;
  const leaderName = (id: string) => teamLeaders.find((t) => t.id === id)?.name || "—";
  const leaderPlots = (leaderId: string) => {
    const l = teamLeaders.find((t) => t.id === leaderId);
    const ids: string[] = l?.plotIds && l.plotIds.length ? l.plotIds : l?.plotId ? [l.plotId] : [];
    return plots.filter((p) => ids.includes(p.id));
  };

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
    [tasks, plots, filterPlot, filterLeader, filterZone]
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

  const groupByPlot = (dayTasks: Task[]) => {
    const map = new Map<string, Task[]>();
    dayTasks.forEach((t) => { const a = map.get(t.plotId) || []; a.push(t); map.set(t.plotId, a); });
    return Array.from(map.entries());
  };
  const summarize = (items: Task[]) => ({
    total: items.length,
    done: items.filter((t) => t.status === "completed").length,
    overdue: items.filter((t) => t.status === "overdue").length,
    notDone: items.length - items.filter((t) => t.status === "completed").length,
  });

  // Modal đổi lịch / đổi tổ trưởng cho 1 việc
  const [modalTask, setModalTask] = React.useState<Task | null>(null);
  const [modalDate, setModalDate] = React.useState("");
  const [modalLeader, setModalLeader] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const openTaskModal = (task: Task) => {
    setModalTask(task);
    setModalDate(task.date);
    setModalLeader(task.teamLeaderId);
  };
  const closeTaskModal = () => {
    if (saving) return;
    setModalTask(null);
  };

  const handleUpdate = async () => {
    if (!modalTask) return;
    const dateChanged = !!modalDate && modalDate !== modalTask.date;
    const leaderChanged = !!modalLeader && modalLeader !== modalTask.teamLeaderId;
    if (!dateChanged && !leaderChanged) {
      alert("Chưa có thay đổi nào để cập nhật.");
      return;
    }
    setSaving(true);
    try {
      if (dateChanged) await rescheduleTask(modalTask.id, modalDate);
      if (leaderChanged) await reassignTask(modalTask.id, modalLeader);
      await reloadCalendar();
      setModalTask(null);
    } catch (e) {
      alert("Không cập nhật được công việc. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const leaderOverview = React.useMemo(() => {
    if (filterLeader === "all") return null;
    const myPlots = leaderPlots(filterLeader);
    const donePlotsToday = myPlots.filter((p) => {
      const t = tasks.filter((x) => x.plotId === p.id && x.date === fmtYMD(TODAY));
      return t.length > 0 && t.every((x) => x.status === "completed");
    }).length;
    return { name: leaderName(filterLeader), totalPlots: myPlots.length, donePlotsToday };
  }, [filterLeader, tasks, plots, teamLeaders]);

  const monthLabel = `Tháng ${viewMonth.getMonth() + 1}/${viewMonth.getFullYear()}`;
  const selTasks = tasksOn(selectedDay);
  const selGrouped = groupByPlot(selTasks);

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Đang tải lịch công việc…</div>;
  }
  if (loadError) {
    return <div className="p-10 text-center text-red-600">{loadError}</div>;
  }

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

      {/* Lịch + chi tiết cạnh nhau trên màn lớn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Lịch tháng */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 p-3 sm:p-5">
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
                className={`min-h-[44px] sm:min-h-[52px] lg:min-h-[60px] rounded-lg border p-1 sm:p-1.5 text-left transition flex flex-col
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

      {/* Chi tiết ngày đang chọn — cột bên, dính theo cuộn trên màn lớn */}
      <div className="bg-white rounded-lg shadow border border-gray-200 lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg sticky top-0">
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
                        <Button variant="secondary" size="sm" onClick={() => openTaskModal(task)}>Cập nhật</Button>
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

      {/* Modal đổi lịch / đổi tổ trưởng cho 1 việc */}
      {modalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeTaskModal}>
          <div
            className="w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Điều chỉnh công việc</h3>
              <button onClick={closeTaskModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-900">{modalTask.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-green-600" />
                  <span>{plotName(modalTask.plotId)}</span>
                  <span>· {modalTask.crop}</span>
                </div>
              </div>

              {/* Đổi ngày */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đổi ngày</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Đổi tổ trưởng */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đổi tổ trưởng</label>
                <select
                  value={modalLeader}
                  onChange={(e) => setModalLeader(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {teamLeaders.map((tl) => (
                    <option key={tl.id} value={tl.id}>{tl.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeTaskModal} disabled={saving}>Đóng</Button>
              <Button variant="primary" size="sm" onClick={handleUpdate} disabled={saving}>
                {saving ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
