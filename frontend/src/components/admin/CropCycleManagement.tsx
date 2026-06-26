import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, Calendar, FileText, X, AlertTriangle, MapPin, Edit2, Trash2, ChevronDown, ChevronRight, Filter, LayoutGrid, List, Layers, User } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import { Modal, Field, FormActions, ConfirmDialog, inputCls } from "../ui/FormModal";
import { getCropCycles, getZones, getPlots, getProcesses, getReports, getTeamLeaders, createCropCycle, updateCropCycle, deleteCropCycle } from "../../lib/queries";
import { todayYMD } from "../../lib/today";
import { toast } from "../../lib/toast";

interface Cycle { id: string; plotId: string; crop: string; startDate: string; processId: string; status: string; teamLeaderId?: string; }

const CYCLE_STATUS: Record<string, { label: string; badge: "active" | "pending" | "completed" }> = {
  active: { label: "Đang hoạt động", badge: "active" },
  paused: { label: "Tạm dừng", badge: "pending" },
  done: { label: "Kết thúc", badge: "completed" },
  closed: { label: "Đã đóng", badge: "completed" },
};
const emptyCycle = (firstPlotId = "", firstProcessId = ""): Cycle => ({ id: "", plotId: firstPlotId, crop: "Gấc", startDate: todayYMD(), processId: firstProcessId, status: "active", teamLeaderId: "" });
const cropOrder = (crop: string) => (crop === "Gấc" ? 0 : crop === "Sâm" ? 1 : 2);

export function CropCycleManagement() {
  const navigate = useNavigate();
  const [reportPlotId, setReportPlotId] = useState<string | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<any[]>([]);
  const [teamLeaderReports, setTeamLeaderReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycleModal, setCycleModal] = useState<{ mode: "add" | "edit"; data: Cycle } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reloadCycles = async () => {
    const cyclesData = await getCropCycles();
    setCycles(cyclesData || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cyclesData, zonesData, plotsData, processesData, reportsData, leadersData] = await Promise.all([
          getCropCycles(),
          getZones(),
          getPlots(),
          getProcesses(),
          getReports(),
          getTeamLeaders(),
        ]);
        setCycles(cyclesData || []);
        setZones(zonesData || []);
        setPlots(plotsData || []);
        setProcesses(processesData || []);
        setTeamLeaderReports(reportsData || []);
        setTeamLeaders(leadersData || []);
        setOpenZones(new Set((zonesData || []).map((z: any) => z.id)));
      } catch (error) {
        console.error("Failed to fetch crop cycle data:", error);
        setCycles([]);
        setZones([]);
        setPlots([]);
        setProcesses([]);
        setTeamLeaderReports([]);
        setTeamLeaders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Bộ lọc + chế độ xem + accordion vùng
  const [fZone, setFZone] = useState("all");
  const [fCrop, setFCrop] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [openZones, setOpenZones] = useState<Set<string>>(() => new Set());
  const toggleZone = (id: string) => setOpenZones((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const saveCycle = async (data: Cycle) => {
    if (!data.plotId || !data.crop || !data.startDate) {
      toast.warning("Vui lòng nhập đầy đủ Lô, Loại cây và Ngày bắt đầu.");
      return;
    }
    if (!data.teamLeaderId) {
      toast.warning("Vui lòng chọn tổ trưởng phụ trách.");
      return;
    }
    setSaving(true);
    try {
      if (data.id) {
        await updateCropCycle(data.id, {
          block: data.plotId,
          crop: data.crop,
          cultivation_process: data.processId || undefined,
          start_date: data.startDate,
          status: data.status,
          team_leader: data.teamLeaderId || "",
        });
      } else {
        await createCropCycle({
          block: data.plotId,
          crop: data.crop,
          start_date: data.startDate,
          cultivation_process: data.processId || undefined,
          status: data.status,
          team_leader: data.teamLeaderId || undefined,
        });
      }
      await reloadCycles();
      setCycleModal(null);
    } catch (error: any) {
      console.error("Failed to save crop cycle:", error);
      toast.error(error?.message || "Lưu chu kỳ thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };
  const deleteCycle = async (id: string) => {
    try {
      const res: any = await deleteCropCycle(id);
      await reloadCycles();
      if (res?.closed) {
        toast.info("Chu kỳ đã có việc hoàn thành nên được ĐÓNG (giữ lịch sử) thay vì xoá; các việc chưa xong đã được gỡ.");
      }
    } catch (error: any) {
      console.error("Failed to delete crop cycle:", error);
      toast.error(error?.message || "Xóa chu kỳ thất bại. Vui lòng thử lại.");
    } finally {
      setConfirmId(null);
    }
  };
  const goToPlot = (plotId: string) => navigate(`/admin/zones?plot=${plotId}`);
  const leaderName = (id?: string) => (id ? (teamLeaders.find((l) => l.id === id)?.name || id) : "");

  const cycleProgress = (cycle: Cycle): number => {
    const days = Math.floor((new Date().getTime() - new Date(cycle.startDate).getTime()) / 86400000);
    return Math.min(Math.max(Math.round((days / 90) * 100), 0), 100);
  };

  // Lọc chu kỳ
  const visibleCycles = cycles.filter((c) => {
    if (fCrop !== "all" && c.crop !== fCrop) return false;
    if (fStatus !== "all" && c.status !== fStatus) return false;
    return true;
  });
  // Gom theo Vùng → Lô → chu kỳ
  const zoneGroups = zones
    .filter((z) => fZone === "all" || z.id === fZone)
    .map((z) => {
      const zonePlots = plots
        .filter((p) => p.zoneId === z.id)
        .map((plot) => ({ plot, plotCycles: visibleCycles.filter((c) => c.plotId === plot.id).sort((a, b) => cropOrder(a.crop) - cropOrder(b.crop)) }))
        .filter((g) => g.plotCycles.length > 0);
      const cycleCount = zonePlots.reduce((s, g) => s + g.plotCycles.length, 0);
      return { zone: z, zonePlots, cycleCount };
    })
    .filter((g) => g.zonePlots.length > 0);

  const reportPlot = reportPlotId ? plots.find((p) => p.id === reportPlotId) : null;
  const plotReports = reportPlotId ? teamLeaderReports.filter((r) => r.plotId === reportPlotId) : [];
  const hasFilter = fZone !== "all" || fCrop !== "all" || fStatus !== "all";

  // ----- Thẻ một lô (gọn): 2 cây Gấc/Sâm mỗi cây 1 dòng -----
  const PlotCard = ({ plot, plotCycles }: { plot: typeof plots[number]; plotCycles: Cycle[] }) => {
    const reportCount = teamLeaderReports.filter((r) => r.plotId === plot.id).length;
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header lô gọn 1 dòng */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/60">
          <div className="min-w-0 flex items-baseline gap-2">
            <button type="button" onClick={() => goToPlot(plot.id)} className="font-semibold text-gray-900 hover:text-green-700 truncate">{plot.name}</button>
            <span className="text-xs text-gray-500 shrink-0">{(plot.area / 10000).toFixed(1)} ha · {plot.teamLeader || "—"}</span>
          </div>
          <button onClick={() => setReportPlotId(plot.id)} className="shrink-0 inline-flex items-center gap-1 text-xs text-green-700 hover:bg-green-50 rounded-md px-2 py-1" title="Xem báo cáo tổ trưởng">
            <FileText className="w-4 h-4" /> Báo cáo{reportCount > 0 && <span className="inline-flex items-center justify-center px-1.5 h-4 min-w-[18px] rounded-full bg-green-100 text-green-800 text-[10px] font-medium">{reportCount}</span>}
          </button>
        </div>
        {/* 2 dòng cây */}
        <div className="divide-y divide-gray-100">
          {plotCycles.map((cycle) => {
            const process = processes.find((p) => p.id === cycle.processId);
            const cs = CYCLE_STATUS[cycle.status] ?? CYCLE_STATUS.active;
            const progress = cycleProgress(cycle);
            const isGac = cycle.crop === "Gấc";
            const ldName = leaderName(cycle.teamLeaderId || plot.teamLeaderId) || "Chưa gán";
            return (
              <div key={cycle.id} className="flex items-center gap-2 sm:gap-3 px-3 py-2"
                title={`${process?.name || ""} · Bắt đầu ${new Date(cycle.startDate).toLocaleDateString("vi-VN")} · Tổ trưởng: ${ldName}`}>
                <span className={`shrink-0 inline-block w-2 h-2 rounded-full ${isGac ? "bg-emerald-500" : "bg-amber-500"}`} />
                <div className="w-[88px] shrink-0">
                  <div className="text-sm font-medium text-gray-900 leading-tight">{cycle.crop}</div>
                  <div className="text-[11px] text-gray-400 leading-tight">{isGac ? "Giàn trên" : "Dưới tán"}</div>
                </div>
                <StatusBadge status={cs.badge}>{cs.label}</StatusBadge>
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500 truncate max-w-[120px] shrink-0" title={`Tổ trưởng: ${ldName}`}>
                  <User className="w-3 h-3 shrink-0" /> {ldName}
                </span>
                <div className="flex-1 min-w-[48px] flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isGac ? "bg-emerald-600" : "bg-amber-500"}`} style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{progress}%</span>
                </div>
                <button onClick={() => setCycleModal({ mode: "edit", data: { ...cycle } })} className="shrink-0 p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Sửa chu kỳ"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setConfirmId(cycle.id)} className="shrink-0 p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa chu kỳ"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý chu kỳ cây trồng</h2>
          <p className="text-gray-600 mt-1">Khai báo và theo dõi chu kỳ canh tác của từng lô</p>
        </div>
        <Button variant="primary" onClick={() => setCycleModal({ mode: "add", data: emptyCycle(plots[0]?.id ?? "", processes[0]?.id ?? "") })}>
          <Plus className="w-4 h-4 mr-2" /> Thêm chu kỳ mới
        </Button>
      </div>

      {/* Bộ lọc + chế độ xem */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-gray-500"><Filter className="w-5 h-5" /><span className="text-sm font-medium">Bộ lọc</span></div>
        <select value={fZone} onChange={(e) => setFZone(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto">
          <option value="all">Tất cả vùng</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={fCrop} onChange={(e) => setFCrop(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto">
          <option value="all">Tất cả cây</option>
          <option value="Gấc">Gấc</option>
          <option value="Sâm">Sâm</option>
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto">
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="paused">Tạm dừng</option>
          <option value="done">Kết thúc</option>
        </select>
        {hasFilter && <Button variant="ghost" size="sm" onClick={() => { setFZone("all"); setFCrop("all"); setFStatus("all"); }}>Xóa lọc</Button>}
        {/* Toggle Danh sách / Lưới */}
        <div className="ml-auto inline-flex rounded-lg border border-gray-300 overflow-hidden">
          <button onClick={() => setView("list")} className={`flex items-center gap-1 px-3 py-2 text-sm ${view === "list" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
            <List className="w-4 h-4" /> Danh sách
          </button>
          <button onClick={() => setView("grid")} className={`flex items-center gap-1 px-3 py-2 text-sm ${view === "grid" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
            <LayoutGrid className="w-4 h-4" /> Lưới
          </button>
        </div>
      </div>

      {/* Vùng — dạng Lưới thì các vùng nằm trên cùng hàng, dạng Danh sách thì xếp dọc */}
      <div className={view === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-4 items-start" : "space-y-4"}>
        {zoneGroups.length === 0 && (
          <div className="xl:col-span-2 bg-white rounded-lg shadow border border-gray-200 p-10 text-center text-gray-400">Không có chu kỳ phù hợp bộ lọc.</div>
        )}
        {zoneGroups.map(({ zone, zonePlots, cycleCount }) => {
          const open = openZones.has(zone.id);
          return (
            <div key={zone.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {/* Header vùng */}
              <button onClick={() => toggleZone(zone.id)} className="w-full flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-4 bg-gray-50 border-b border-gray-200 text-left">
                <span className="flex items-center gap-2 min-w-0">
                  {open ? <ChevronDown className="w-5 h-5 text-gray-600 shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-600 shrink-0" />}
                  <Layers className="w-5 h-5 text-green-600 shrink-0" />
                  <span className="font-semibold text-gray-900">{zone.name}</span>
                  <span className="text-sm text-gray-500">· {zonePlots.length} lô · {cycleCount} chu kỳ</span>
                </span>
                <StatusBadge status={zone.status as any}>
                  {zone.status === "good" ? "Bình thường" : zone.status === "warning" ? "Cần chú ý" : zone.status === "danger" ? "Có vấn đề" : "—"}
                </StatusBadge>
              </button>

              {/* Lô trong vùng — xếp dọc gọn (mỗi lô đã rất nhỏ) */}
              {open && (
                <div className="p-3 sm:p-4 space-y-2.5">
                  {zonePlots.map(({ plot, plotCycles }) => <PlotCard key={plot.id} plot={plot} plotCycles={plotCycles} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lưu ý */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Lưu ý — Mô hình xen canh 2 tầng</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Mỗi lô canh tác đồng thời <strong>2 tầng cây trên cùng diện tích</strong>: Gấc leo giàn (tầng trên) và Sâm dưới tán (tầng dưới) — tương ứng 2 chu kỳ song song.</li>
          <li>• Mỗi tầng cây có <strong>quy trình và lịch công việc riêng</strong>; hệ thống tự sinh công việc theo quy trình đã chọn.</li>
          <li>• Có thể tạm dừng hoặc kết thúc sớm từng tầng độc lập mà không ảnh hưởng tầng còn lại.</li>
        </ul>
      </div>

      {/* Modal: Báo cáo tổ trưởng theo lô */}
      {reportPlotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReportPlotId(null)}></div>
          <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Báo cáo tổ trưởng — {reportPlot?.name || reportPlotId}</h3>
                {reportPlot && (
                  <button type="button" onClick={() => goToPlot(reportPlotId)} className="mt-1 inline-flex items-center gap-1 text-xs text-green-700 hover:underline">
                    <MapPin className="w-3.5 h-3.5" />{zones.find((z) => z.id === reportPlot.zoneId)?.name || "—"} · {reportPlot.teamLeader} · {(reportPlot.area / 10000).toFixed(1)} ha
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setReportPlotId(null)} className="text-gray-400 hover:text-gray-600 p-1 -mr-1" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-4">
              {plotReports.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Chưa có báo cáo cho lô này</p>
              ) : (
                plotReports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{new Date(report.date).toLocaleDateString("vi-VN")}</span>
                        <span className="text-gray-300">·</span><span className="font-medium text-gray-900">{report.reporter}</span>
                        <span className="text-gray-300">·</span><span className="text-gray-600">{report.crop}</span>
                      </div>
                      {report.abnormal ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle className="w-3.5 h-3.5" />Bất thường</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Bình thường</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{report.content}</p>
                    {report.photos && report.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {report.photos.map((photo: string, idx: number) => (
                          <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={photo} alt={`Ảnh ${idx + 1}`} className="w-20 h-20 object-cover rounded-md border border-gray-200 hover:opacity-90" />
                          </a>
                        ))}
                      </div>
                    )}
                    {report.reply ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-xs font-medium text-blue-900 mb-1">Phản hồi của quản trị</p>
                        <p className="text-sm text-blue-800">{report.reply}</p>
                      </div>
                    ) : <p className="text-xs text-gray-400 italic">Chưa có phản hồi</p>}
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setReportPlotId(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm/sửa chu kỳ */}
      {cycleModal && <CycleForm modal={cycleModal} zones={zones} plots={plots} processes={processes} teamLeaders={teamLeaders} saving={saving} onClose={() => setCycleModal(null)} onSave={saveCycle} />}

      {/* Xác nhận xóa */}
      {confirmId && (
        <ConfirmDialog
          title="Xóa chu kỳ cây trồng?"
          message="Bạn có chắc muốn xóa chu kỳ này? Công việc đã sinh từ chu kỳ có thể bị ảnh hưởng."
          onCancel={() => setConfirmId(null)}
          onConfirm={() => deleteCycle(confirmId)}
        />
      )}
    </div>
  );
}

// Form: chọn VÙNG trước → rồi chọn LÔ trong vùng đó
function CycleForm({ modal, zones, plots, processes, teamLeaders, saving, onClose, onSave }: { modal: { mode: "add" | "edit"; data: Cycle }; zones: any[]; plots: any[]; processes: any[]; teamLeaders: any[]; saving: boolean; onClose: () => void; onSave: (d: Cycle) => void; }) {
  const ownerOf = (pid: string) => plots.find((p) => p.id === pid)?.teamLeaderId || "";
  // Có tổ trưởng đã lưu -> hiện đúng người đó; chưa lưu -> mặc định = chủ lô (người thực nhận việc).
  const [form, setForm] = React.useState<Cycle>(
    modal.data.teamLeaderId ? modal.data : { ...modal.data, teamLeaderId: ownerOf(modal.data.plotId) }
  );
  const [zoneId, setZoneId] = React.useState<string>(
    plots.find((p) => p.id === modal.data.plotId)?.zoneId ?? zones[0]?.id ?? ""
  );
  const zonePlots = plots.filter((p) => p.zoneId === zoneId);

  // Đổi lô -> tổ trưởng mặc định nhảy theo chủ lô mới
  const setPlot = (pid: string) => setForm((f) => ({ ...f, plotId: pid, teamLeaderId: ownerOf(pid) }));
  const onZoneChange = (zid: string) => {
    setZoneId(zid);
    setPlot(plots.find((p) => p.zoneId === zid)?.id ?? "");
  };

  return (
    <Modal title={modal.mode === "add" ? "Thêm chu kỳ cây trồng" : "Sửa chu kỳ cây trồng"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vùng *">
          <select value={zoneId} onChange={(e) => onZoneChange(e.target.value)} className={inputCls}>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </Field>
        <Field label="Lô *">
          <select value={form.plotId} onChange={(e) => setPlot(e.target.value)} className={inputCls}>
            {zonePlots.length === 0 && <option value="">(Vùng chưa có lô)</option>}
            {zonePlots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loại cây">
          <select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} className={inputCls}>
            <option value="Gấc">Gấc</option>
            <option value="Sâm">Sâm</option>
          </select>
        </Field>
        <Field label="Ngày bắt đầu">
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label="Quy trình">
        <select value={form.processId} onChange={(e) => setForm({ ...form, processId: e.target.value })} className={inputCls}>
          {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Tổ trưởng phụ trách">
        <select value={form.teamLeaderId || ""} onChange={(e) => setForm({ ...form, teamLeaderId: e.target.value })} className={inputCls}>
          <option value="" disabled>— Chọn tổ trưởng —</option>
          {teamLeaders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>
      <Field label="Trạng thái">
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
          <option value="active">Đang hoạt động</option>
          <option value="paused">Tạm dừng</option>
          <option value="done">Kết thúc</option>
        </select>
      </Field>
      <FormActions onClose={onClose} onSave={() => onSave(form)} disabled={!form.plotId || !form.teamLeaderId || saving} />
    </Modal>
  );
}
