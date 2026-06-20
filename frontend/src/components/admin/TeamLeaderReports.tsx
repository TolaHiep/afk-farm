import React from "react";
import { ClipboardList, ImageIcon, AlertTriangle, Send } from "lucide-react";
import { getReports, getTeamLeaders, getPlots, getZones, markReportReviewed, replyReport } from "../../lib/queries";
import { toast } from "../../lib/toast";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ xem", cls: "bg-yellow-100 text-yellow-800" },
  reviewed: { label: "Đã xem", cls: "bg-green-100 text-green-800" },
  replied: { label: "Đã phản hồi", cls: "bg-blue-100 text-blue-800" },
};

export function TeamLeaderReports() {
  const [leader, setLeader] = React.useState("all");
  const [plot, setPlot] = React.useState("all");
  const [zone, setZone] = React.useState("all");
  const [crop, setCrop] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [abnormal, setAbnormal] = React.useState("all");
  const [date, setDate] = React.useState("");
  const [detail, setDetail] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [teamLeaderReports, setTeamLeaderReports] = React.useState<any[]>([]);
  const [teamLeaders, setTeamLeaders] = React.useState<any[]>([]);
  const [plots, setPlots] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");

  React.useEffect(() => {
    Promise.all([getReports(), getTeamLeaders(), getPlots(), getZones()])
      .then(([reports, leaders, plotList, zoneList]) => {
        setTeamLeaderReports(reports);
        setTeamLeaders(leaders);
        setPlots(plotList);
        setZones(zoneList);
      })
      .catch(() => setLoadError("Không tải được dữ liệu báo cáo từ máy chủ"))
      .finally(() => setLoading(false));
  }, []);

  // Map id -> đối tượng lô/vùng (chỉ tra khi cần tên lô/vùng)
  const plotById = React.useMemo(() => {
    const m = new Map<string, any>();
    plots.forEach((p) => m.set(p.id ?? p.name, p));
    return m;
  }, [plots]);
  const zoneNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    zones.forEach((z) => m.set(z.id ?? z.name, z.zone_name ?? z.name ?? z.id));
    return m;
  }, [zones]);

  const plotLabel = React.useCallback((plotId: string) => {
    const p = plotById.get(plotId);
    if (!p) return plotId;
    const plotName = p.block_name ?? p.name ?? plotId;
    const zoneId = p.zoneId ?? p.zone;
    const zoneName = zoneId ? zoneNameById.get(zoneId) : undefined;
    return zoneName ? `${zoneName} · ${plotName}` : plotName;
  }, [plotById, zoneNameById]);

  const plotZoneId = React.useCallback((plotId: string) => {
    const p = plotById.get(plotId);
    return p ? (p.zoneId ?? p.zone) : undefined;
  }, [plotById]);

  // Mở chi tiết: hiện modal + tự đánh dấu 'reviewed' nếu đang 'pending'
  const openDetail = async (id: string) => {
    setDetail(id);
    setReply("");
    const r = teamLeaderReports.find((x) => x.id === id);
    if (r?.status === "pending") {
      try {
        await markReportReviewed(id);
        setTeamLeaderReports((prev) => prev.map((x) => (x.id === id ? { ...x, status: "reviewed" } : x)));
      } catch (e: any) {
        toast.error(e?.message || "Không cập nhật được trạng thái báo cáo.");
      }
    }
  };

  const handleReply = async () => {
    const text = reply.trim();
    if (!text || !detail) { toast.warning("Vui lòng nhập nội dung phản hồi."); return; }
    setSending(true);
    try {
      await replyReport(detail, text);
      setTeamLeaderReports((prev) => prev.map((x) => (x.id === detail ? { ...x, status: "replied", reply: text } : x)));
      setReply("");
      toast.success("Đã lưu phản hồi.");
    } catch (e: any) {
      toast.error(e?.message || "Không gửi được phản hồi. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Đang tải…</div>;
  }

  if (loadError) {
    return <div className="p-10 text-center text-red-500">{loadError}</div>;
  }

  // Danh sách loại cây có thật trong dữ liệu báo cáo
  const crops = Array.from(new Set(teamLeaderReports.map((r) => r.crop)));

  const rows = teamLeaderReports.filter((r) => {
    if (leader !== "all" && r.teamLeaderId !== leader) return false;
    if (plot !== "all" && r.plotId !== plot) return false;
    if (zone !== "all" && plotZoneId(r.plotId) !== zone) return false;
    if (crop !== "all" && r.crop !== crop) return false;
    if (status !== "all" && r.status !== status) return false;
    if (abnormal === "yes" && !r.abnormal) return false;
    if (abnormal === "no" && r.abnormal) return false;
    if (date && r.date !== date) return false;
    return true;
  });
  const current = teamLeaderReports.find((r) => r.id === detail);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-green-600" /> Báo cáo tổ trưởng
        </h2>
        <p className="text-sm text-gray-500">Lịch sử báo cáo theo ngày, lô và tổ trưởng — đối chiếu tiến độ thực tế</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <select value={leader} onChange={(e) => setLeader(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">Tất cả tổ trưởng</option>
          {teamLeaders.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={zone} onChange={(e) => setZone(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">Tất cả vùng</option>
          {zones.map((z) => <option key={z.id ?? z.name} value={z.id ?? z.name}>{z.zone_name ?? z.name ?? z.id}</option>)}
        </select>
        <select value={plot} onChange={(e) => setPlot(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">Tất cả lô</option>
          {plots.map((p) => <option key={p.id ?? p.name} value={p.id ?? p.name}>{p.block_name ?? p.name ?? p.id}</option>)}
        </select>
        <select value={crop} onChange={(e) => setCrop(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">Tất cả loại cây</option>
          {crops.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={abnormal} onChange={(e) => setAbnormal(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">Bất thường: tất cả</option>
          <option value="yes">Có bất thường</option>
          <option value="no">Không bất thường</option>
        </select>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["Ngày", "Tổ trưởng", "Lô", "Cây", "Nội dung", "Ảnh", "Bất thường", "Trạng thái", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => {
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.reporter}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{plotLabel(r.plotId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.crop}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{r.content}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {(r.photos ?? []).length > 0 ? <span className="inline-flex items-center gap-1"><ImageIcon className="w-4 h-4" />{r.photos.length}</span> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.abnormal
                      ? <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle className="w-4 h-4" /> Có</span>
                      : <span className="text-gray-400 text-xs">Không</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(r.id)} className="text-sm text-green-600 hover:underline">Xem</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">Không có báo cáo phù hợp</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {rows.map((r) => {
          return (
            <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{r.date}</span>
                <div className="flex items-center gap-2">
                  {r.abnormal && (
                    <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle className="w-4 h-4" /> Bất thường</span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{r.reporter}</span> · {plotLabel(r.plotId)} · {r.crop}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{r.content}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {(r.photos ?? []).length > 0
                    ? <span className="inline-flex items-center gap-1"><ImageIcon className="w-4 h-4" />{r.photos.length} ảnh</span>
                    : "Không có ảnh"}
                </span>
                <button onClick={() => setDetail(r.id)} className="text-sm text-green-600 hover:underline">Xem</button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-10 text-center text-gray-400 text-sm">Không có báo cáo phù hợp</div>
        )}
      </div>

      {/* Detail modal */}
      {current && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Báo cáo ngày {current.date}</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            <div className="text-sm text-gray-500">{current.reporter} · {plotLabel(current.plotId)} · {current.crop}</div>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">{current.content}</div>
            {(current.photos ?? []).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {current.photos.map((src: string) => (
                  <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                    <img src={src} alt="ảnh báo cáo" className="w-full h-28 object-cover rounded-lg border border-gray-200" />
                  </a>
                ))}
              </div>
            )}
            {current.abnormal && (
              <div className="inline-flex items-center gap-1 text-red-600 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> Có bất thường</div>
            )}
            {current.reply && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <div className="font-medium text-blue-800 mb-1">Phản hồi Admin</div>
                <p className="text-blue-900 whitespace-pre-line">{current.reply}</p>
              </div>
            )}

            {/* Form phản hồi (luôn cho phép cập nhật/sửa) */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {current.reply ? "Cập nhật phản hồi" : "Phản hồi cho tổ trưởng"}
              </label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
                placeholder="Nhập nội dung phản hồi…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setDetail(null)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Đóng</button>
                <button onClick={handleReply} disabled={sending || !reply.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Send className="w-4 h-4" /> {sending ? "Đang gửi…" : "Gửi phản hồi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
