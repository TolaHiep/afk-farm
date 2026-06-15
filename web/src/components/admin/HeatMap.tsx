import React from "react";
import { Link } from "react-router";
import { Filter, Calendar, MapPin, Sprout, User, AlertTriangle, CheckCircle2, Clock, CircleDashed } from "lucide-react";
import { Button } from "../ui/button";
import { plots, zones, tasks, anomalies, zoneName } from "../../lib/mockData";

type StatusKey = "good" | "warning" | "danger" | "pending" | "done" | "inactive";

const STATUS: Record<StatusKey, { label: string; tile: string; ring: string; dot: string; bar: string; text: string }> = {
  good:     { label: "Bình thường",   tile: "bg-green-50 border-green-500",   ring: "ring-green-500",   dot: "bg-green-500",   bar: "bg-green-500",   text: "text-green-700" },
  done:     { label: "Đã hoàn thành", tile: "bg-emerald-50 border-emerald-600", ring: "ring-emerald-600", dot: "bg-emerald-600", bar: "bg-emerald-600", text: "text-emerald-700" },
  warning:  { label: "Cần chú ý",     tile: "bg-amber-50 border-amber-500",   ring: "ring-amber-500",   dot: "bg-amber-500",   bar: "bg-amber-500",   text: "text-amber-700" },
  danger:   { label: "Có vấn đề",     tile: "bg-red-50 border-red-500",       ring: "ring-red-500",     dot: "bg-red-500",     bar: "bg-red-500",     text: "text-red-700" },
  pending:  { label: "Chưa xử lý",    tile: "bg-gray-50 border-gray-300",     ring: "ring-gray-400",    dot: "bg-gray-400",    bar: "bg-gray-400",    text: "text-gray-600" },
  inactive: { label: "Nghỉ",          tile: "bg-gray-50 border-gray-200",     ring: "ring-gray-300",    dot: "bg-gray-300",    bar: "bg-gray-300",    text: "text-gray-500" },
};

const st = (s: string) => STATUS[(s as StatusKey)] || STATUS.pending;

export function HeatMap() {
  const [selectedPlot, setSelectedPlot] = React.useState<string | null>(null);
  const [filterDate, setFilterDate] = React.useState("2026-06-14");
  const [filterZone, setFilterZone] = React.useState("all");
  const [filterCrop, setFilterCrop] = React.useState("all");

  const selectedPlotData = plots.find((p) => p.id === selectedPlot);

  // Lọc lô theo vùng + loại cây
  const visiblePlots = plots.filter((p) => {
    if (filterZone !== "all" && p.zoneId !== filterZone) return false;
    if (filterCrop !== "all" && !p.crop.includes(filterCrop)) return false;
    return true;
  });

  // Lấy danh sách cây của lô theo bộ lọc loại cây (nếu lọc 1 cây thì chỉ giữ cây đó)
  const cropsOf = (p: typeof plots[number]) =>
    filterCrop === "all" ? p.crops : p.crops.filter((c) => c.crop === filterCrop);

  // Tổng quan trạng thái: đếm theo TỪNG CÂY đang hiển thị (xen canh: mỗi lô tối đa 2 cây)
  const allShownCrops = visiblePlots.flatMap(cropsOf);
  const summary = {
    good: allShownCrops.filter((c) => c.status === "good" || c.status === "done").length,
    warning: allShownCrops.filter((c) => c.status === "warning" || c.status === "pending").length,
    danger: allShownCrops.filter((c) => c.status === "danger").length,
  };

  // Vùng hiển thị (kèm lô đã lọc)
  const visibleZones = zones
    .map((z) => ({ zone: z, items: visiblePlots.filter((p) => p.zoneId === z.id) }))
    .filter((g) => g.items.length > 0);

  // Công việc của lô đang chọn theo ngày đã lọc (tôn trọng bộ lọc loại cây)
  const plotTasks = tasks.filter(
    (t) => t.plotId === selectedPlot && t.date === filterDate && (filterCrop === "all" || t.crop === filterCrop)
  );
  // Cấu hình hiển thị theo trạng thái việc
  const TASK_STATUS: Record<string, { title: string; dot: string; text: string; Icon: typeof CheckCircle2 }> = {
    completed:     { title: "Đã hoàn thành", dot: "bg-green-500", text: "text-green-700", Icon: CheckCircle2 },
    "in-progress": { title: "Đang làm",      dot: "bg-blue-500",  text: "text-blue-700",  Icon: Clock },
    pending:       { title: "Chưa làm",      dot: "bg-gray-400",  text: "text-gray-600",  Icon: CircleDashed },
    overdue:       { title: "Quá hạn",       dot: "bg-red-500",   text: "text-red-700",   Icon: AlertTriangle },
  };
  const TASK_ORDER = ["completed", "in-progress", "pending", "overdue"];
  // Chia việc theo TỪNG CÂY (xen canh) trước, trong mỗi cây sắp xếp theo trạng thái
  const detailCrops = selectedPlotData ? (filterCrop === "all" ? selectedPlotData.crops : selectedPlotData.crops.filter((c) => c.crop === filterCrop)) : [];
  const tasksByCrop = detailCrops.map((c) => ({
    crop: c,
    items: plotTasks
      .filter((t) => t.crop === c.crop)
      .sort((a, b) => TASK_ORDER.indexOf(a.status) - TASK_ORDER.indexOf(b.status)),
  }));
  const plotAnomalies = anomalies.filter((a) => a.plotId === selectedPlot && (filterCrop === "all" || a.crop === filterCrop));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Tất cả vùng</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            <select value={filterCrop} onChange={(e) => setFilterCrop(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Tất cả cây</option>
              <option value="Gấc">Gấc</option>
              <option value="Sâm">Sâm</option>
            </select>
          </div>

          {/* Tổng quan nhanh */}
          <div className="ml-auto flex items-center gap-2">
            <SummaryChip color="bg-green-500" label="Bình thường" value={summary.good} />
            <SummaryChip color="bg-amber-500" label="Cần chú ý" value={summary.warning} />
            <SummaryChip color="bg-red-500" label="Có vấn đề" value={summary.danger} />
          </div>
        </div>
      </div>

      {/* Heat grid + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heat grid */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Bản đồ nhiệt vùng trồng</h3>
            <div className="flex items-center gap-4">
              {(["good", "warning", "danger"] as StatusKey[]).map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${STATUS[k].dot}`} />
                  <span className="text-xs text-gray-500">{STATUS[k].label}</span>
                </div>
              ))}
            </div>
          </div>

          {visibleZones.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">Không có lô phù hợp bộ lọc</div>
          )}

          <div className="space-y-6">
            {visibleZones.map(({ zone, items }) => (
              <div key={zone.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${st(zone.status).dot}`} />
                  <h4 className="text-sm font-semibold text-gray-700">{zone.name}</h4>
                  <span className="text-xs text-gray-400">· {items.length} lô</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {items.map((p) => {
                    const s = st(p.status); // màu nền/viền theo trạng thái xấu nhất của lô
                    const active = selectedPlot === p.id;
                    const shownCrops = cropsOf(p);
                    return (
                      <button key={p.id} onClick={() => setSelectedPlot(p.id)}
                        className={`text-left rounded-xl border-l-4 border border-gray-100 p-3 transition hover:shadow-md ${s.tile} ${active ? `ring-2 ${s.ring}` : ""}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{p.name}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                          <Sprout className="w-3 h-3" /> Xen canh
                        </div>
                        {/* Mỗi cây 1 dòng tiến độ riêng */}
                        <div className="mt-2 space-y-2">
                          {shownCrops.map((c) => {
                            const cs = st(c.status);
                            const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
                            return (
                              <div key={c.crop}>
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="flex items-center gap-1 font-medium text-gray-700">
                                    <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                                    {c.crop}
                                  </span>
                                  <span className="font-medium text-gray-500">{c.done}/{c.total}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-white/70 overflow-hidden">
                                  <div className={`h-full rounded-full ${cs.bar}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-2">
                          <User className="w-3 h-3" /> {p.teamLeader}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plot Details Panel */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          {selectedPlotData ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedPlotData.name}</h3>
                  <p className="text-sm text-gray-500">{zoneName(selectedPlotData.zoneId)} · Xen canh {selectedPlotData.crop}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st(selectedPlotData.status).tile} ${st(selectedPlotData.status).text}`}>
                  {st(selectedPlotData.status).label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoBox label="Tổ trưởng" value={selectedPlotData.teamLeader} />
                <InfoBox label="Diện tích" value={`${selectedPlotData.area.toLocaleString()} m²`} />
              </div>

              {/* Tiến độ riêng từng cây (xen canh) */}
              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">Tiến độ theo cây</h4>
                <div className="space-y-3">
                  {detailCrops.map((c) => {
                    const cs = st(c.status);
                    const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
                    return (
                      <div key={c.crop} className="rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                            <Sprout className={`w-4 h-4 ${cs.text}`} /> {c.crop}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cs.tile} ${cs.text}`}>
                            {cs.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Tiến độ công việc</span>
                          <span className="font-medium">{c.done}/{c.total} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white overflow-hidden">
                          <div className={`h-full rounded-full ${cs.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">Công việc ngày {filterDate}</h4>
                {plotTasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasksByCrop.map(({ crop, items }) => {
                      const cs = st(crop.status);
                      return (
                        <div key={crop.crop}>
                          <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-gray-800">
                            <span className={`w-2 h-2 rounded-full ${cs.dot}`} />
                            {crop.crop} <span className="text-xs font-normal text-gray-400">· {items.length} việc</span>
                          </div>
                          {items.length > 0 ? (
                            <ul className="ml-2 space-y-1.5">
                              {items.map((it) => {
                                const ts = TASK_STATUS[it.status] ?? TASK_STATUS.pending;
                                return (
                                  <li key={it.id} className="flex items-center gap-2 text-sm text-gray-700">
                                    <ts.Icon className={`w-4 h-4 shrink-0 ${ts.text}`} />
                                    <span className="flex-1">{it.title}</span>
                                    <span className={`text-[11px] font-medium ${ts.text}`}>{ts.title}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="ml-2 text-xs text-gray-400">Không có việc</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Không có công việc</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">Bất thường / phát sinh ({plotAnomalies.length})</h4>
                {plotAnomalies.length > 0 ? (
                  <ul className="space-y-2">
                    {plotAnomalies.map((a) => (
                      <li key={a.id} className={`p-2.5 rounded-lg text-sm ${a.status === "resolved" ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"}`}>
                        <div className="font-medium">{a.type}</div>
                        <div className="text-xs opacity-80">{a.description}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Không có bất thường</p>
                )}
              </div>

              <Link to="/admin/calendar">
                <Button variant="primary" className="w-full">Xem lịch công việc</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] text-gray-400">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Chọn một lô để xem chi tiết</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
