import React from "react";
import { Link } from "react-router";
import { Users, AlertCircle, AlertTriangle, LifeBuoy, Sprout, MapPin, ChevronRight } from "lucide-react";
import { KPICard } from "../ui/KPICard";
import { StatusBadge } from "../ui/StatusBadge";
import {
  tasks, plots, zones, teamLeaders, leaderPlots, supportRequests, areaStats, teamCompletionToday, plotName,
} from "../../lib/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ZONE_COLOR: Record<string, { ring: string; dot: string; label: string }> = {
  good: { ring: "border-green-200 bg-green-50", dot: "bg-green-500", label: "Bình thường" },
  warning: { ring: "border-yellow-200 bg-yellow-50", dot: "bg-yellow-500", label: "Cần chú ý" },
  danger: { ring: "border-red-200 bg-red-50", dot: "bg-red-500", label: "Có vấn đề" },
  inactive: { ring: "border-gray-200 bg-gray-50", dot: "bg-gray-400", label: "Nghỉ" },
};

export function Dashboard() {
  const today = tasks.filter((t) => t.date === "2026-06-14");
  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const warningZones = zones.filter((z) => z.status === "warning" || z.status === "danger").length;
  const team = teamCompletionToday();
  const area = areaStats();
  const pendingSupport = supportRequests.filter((s) => s.status === "pending");

  // Zone đang mở để xem danh sách block bên trong (mục 3.1.1)
  const [openZone, setOpenZone] = React.useState<string | null>(null);
  // Modal danh sách tổ chưa hoàn thành việc hôm nay (mục 3.1.3)
  const [showUnfinished, setShowUnfinished] = React.useState(false);
  const unfinishedTeams = teamLeaders
    .filter((t) => t.status === "active" && leaderPlots(t.id).length)
    .map((t) => ({ leader: t, plots: leaderPlots(t.id).filter((p) => p.done < p.total) }))
    .filter((x) => x.plots.length > 0);

  const chartData = [
    { name: "Vùng A", tasks: 8, completed: 6 },
    { name: "Vùng B", tasks: 7, completed: 4 },
    { name: "Vùng C", tasks: 6, completed: 5 },
    { name: "Vùng D", tasks: 5, completed: 2 },
  ];

  return (
    <div className="space-y-6">
      {/* Zone status strip */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Trạng thái vùng (Zone)</h3>
          <Link to="/admin/heatmap" className="text-sm text-green-600 hover:underline">Xem bản đồ nhiệt →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {zones.map((z) => {
            const c = ZONE_COLOR[z.status] || ZONE_COLOR.inactive;
            return (
              <button key={z.id} onClick={() => setOpenZone(openZone === z.id ? null : z.id)}
                className={`text-left rounded-lg border p-4 hover:shadow-sm transition ${c.ring} ${openZone === z.id ? "ring-2 ring-green-500" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{z.name}</span>
                  <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{z.plots} lô · {c.label}</div>
              </button>
            );
          })}
        </div>

        {/* Danh sách block/lô bên trong zone đang chọn (mục 3.1.1) */}
        {openZone && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Lô trong {zones.find((z) => z.id === openZone)?.name}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {plots.filter((p) => p.zoneId === openZone).map((p) => (
                <Link key={p.id} to={`/admin/zones?plot=${p.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{p.name} · {p.crop}</div>
                    <div className="text-xs text-gray-500">{p.teamLeader} · {p.done}/{p.total} việc</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              ))}
              {plots.filter((p) => p.zoneId === openZone).length === 0 && (
                <p className="text-sm text-gray-400">Chưa có lô trong vùng này</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button onClick={() => setShowUnfinished(true)} className="text-left">
          <KPICard title="Tổ đã hoàn thành việc hôm nay" value={`${team.done}/${team.total}`} icon={Users}
            trend={`${team.pending} tổ chưa xong · bấm để xem`} color="green" />
        </button>
        <KPICard title="Việc quá hạn" value={overdueCount} icon={AlertCircle} trend="Cần xử lý ngay" color="red" />
        <KPICard title="Vùng cảnh báo" value={warningZones} icon={AlertTriangle} trend="Vàng / Đỏ" color="yellow" />
        <KPICard title="Yêu cầu hỗ trợ mới" value={pendingSupport.length} icon={LifeBuoy} trend="Chờ xử lý" color="blue" />
      </div>

      {/* Modal: danh sách tổ chưa hoàn thành việc hôm nay (mục 3.1.3) */}
      {showUnfinished && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUnfinished(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Tổ chưa hoàn thành việc hôm nay</h3>
              <button onClick={() => setShowUnfinished(false)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            {unfinishedTeams.length === 0 && <p className="text-sm text-gray-500">Tất cả các tổ đã hoàn thành việc hôm nay.</p>}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {unfinishedTeams.map(({ leader, plots: ps }) => (
                <div key={leader.id} className="p-3 bg-yellow-50 rounded-lg">
                  <div className="font-medium text-gray-900 text-sm">{leader.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {ps.map((p) => `${p.name} (${p.done}/${p.total})`).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Area stats */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-green-600" /> Diện tích đang gieo trồng
          </h3>
          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
            Mô hình xen canh 2 tầng: Gấc (giàn) + Sâm (dưới tán)
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Gấc và Sâm trồng xen trên cùng diện tích nên tổng diện tích phủ của 2 cây có thể trùng nhau.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Tổng diện tích đất" value={`${area.totalHa} ha`} big />
          <Stat label="Diện tích phủ Gấc (giàn)" value={`${area.gacHa} ha`} />
          <Stat label="Diện tích phủ Sâm (dưới tán)" value={`${area.samHa} ha`} />
          <Stat label="Zone hoạt động" value={area.zones} />
          <Stat label="Lô hoạt động" value={area.plots} />
        </div>
      </div>

      {/* Chart + Support */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Công việc theo vùng</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tasks" name="Tổng việc" fill="#9ca3af" />
              <Bar dataKey="completed" name="Hoàn thành" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Yêu cầu hỗ trợ mới</h3>
            <Link to="/admin/support" className="text-sm text-green-600 hover:underline">Tất cả →</Link>
          </div>
          <div className="space-y-3">
            {pendingSupport.length === 0 && <p className="text-sm text-gray-400">Không có yêu cầu mới</p>}
            {pendingSupport.map((s) => (
              <Link key={s.id} to="/admin/support" className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{s.reporter}</span>
                  <StatusBadge status="in-progress">{s.type}</StatusBadge>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {plotName(s.plotId)}
                </p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.content}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Today tasks table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Công việc hôm nay</h3>
          <Link to="/admin/calendar" className="text-sm text-green-600 hover:underline">Lịch công việc →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Công việc", "Lô", "Cây", "Tổ trưởng", "Trạng thái"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {today.map((task) => {
                const plot = plots.find((p) => p.id === task.plotId);
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{plot?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{task.crop}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{plot?.teamLeader}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status as any}>
                        {task.status === "completed" ? "Xong" :
                         task.status === "in-progress" ? "Đang làm" :
                         task.status === "overdue" ? "Quá hạn" : "Chưa làm"}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, big = false }: { label: string; value: React.ReactNode; big?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${big ? "bg-green-50" : "bg-gray-50"}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-bold ${big ? "text-2xl text-green-700" : "text-xl text-gray-900"}`}>{value}</div>
    </div>
  );
}
