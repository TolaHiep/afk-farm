import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, MapPin, Calendar, User, Image as ImageIcon, AlertTriangle, Send } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import { getAnomalies, getPlots, updateAnomaly } from "../../lib/queries";
import { toast } from "../../lib/toast";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chưa xử lý",
  "in-progress": "Đang xử lý",
  resolved: "Đã xử lý",
};

export function AnomalyDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [anomaly, setAnomaly] = useState<any>(null);
  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAnomalies(), getPlots()])
      .then(([anomalyList, plotList]) => {
        const found = anomalyList.find((a: any) => a.id === id);
        setAnomaly(found);
        setReply(found?.reply ?? "");
        setPlots(plotList);
      })
      .catch((e) => console.error("Error fetching anomaly:", e))
      .finally(() => setLoading(false));
  }, [id]);

  const changeStatus = async (status: string) => {
    if (!anomaly) return;
    setSaving(true);
    try {
      await updateAnomaly(anomaly.id, { status });
      setAnomaly((prev: any) => ({ ...prev, status }));
      toast.success(`Đã cập nhật trạng thái: ${STATUS_LABEL[status] || status}.`);
    } catch (e: any) {
      toast.error(e?.message || "Không cập nhật được trạng thái. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!anomaly) return;
    const text = reply.trim();
    if (!text) { toast.warning("Vui lòng nhập nội dung phản hồi."); return; }
    setSaving(true);
    try {
      await updateAnomaly(anomaly.id, { reply: text });
      setAnomaly((prev: any) => ({ ...prev, reply: text }));
      toast.success("Đã lưu phản hồi.");
    } catch (e: any) {
      toast.error(e?.message || "Không lưu được phản hồi. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải…</div>;
  if (!anomaly) return (
    <div className="p-10 text-center">
      <p className="text-gray-600 mb-4">Không tìm thấy báo cáo bất thường.</p>
      <Button variant="secondary" onClick={() => navigate("/admin/notifications")}>Quay lại Thông báo</Button>
    </div>
  );

  const plot = plots.find((p) => (p.id ?? p.name) === anomaly.plotId);
  const plotLabel = plot ? (plot.block_name ?? plot.name ?? anomaly.plotId) : anomaly.plotId;
  const photos: string[] = anomaly.photos ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/admin/notifications")} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Quay lại">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">Chi tiết báo cáo bất thường</h2>
          <p className="text-gray-600 mt-1 text-sm">Mã: {anomaly.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {anomaly.status === "pending" && (
            <Button variant="secondary" disabled={saving} onClick={() => changeStatus("in-progress")}>
              {saving ? "Đang lưu…" : "Bắt đầu xử lý"}
            </Button>
          )}
          {anomaly.status !== "resolved" && (
            <Button variant="primary" disabled={saving} onClick={() => changeStatus("resolved")}>
              {saving ? "Đang lưu…" : "Đánh dấu đã xử lý"}
            </Button>
          )}
        </div>
      </div>

      {/* Thông tin */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Thông tin</h3>
          <StatusBadge status={anomaly.status}>{STATUS_LABEL[anomaly.status] || anomaly.status}</StatusBadge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Info icon={<AlertTriangle className="w-4 h-4" />} label="Loại bất thường" value={anomaly.type || "—"} />
          <Info icon={<MapPin className="w-4 h-4" />} label="Lô" value={plotLabel} />
          <Info label="Cây trồng" value={anomaly.crop} />
          <Info icon={<Calendar className="w-4 h-4" />} label="Ngày báo cáo" value={anomaly.date ? new Date(anomaly.date).toLocaleDateString("vi-VN") : "—"} />
          <Info icon={<User className="w-4 h-4" />} label="Người báo cáo" value={anomaly.reporter || "—"} />
        </div>

        {anomaly.description && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Mô tả chi tiết</p>
            <p className="text-gray-800 whitespace-pre-line">{anomaly.description}</p>
          </div>
        )}
      </div>

      {/* Hình ảnh */}
      {photos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Hình ảnh ({photos.length})</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((url, idx) => (
              <button key={idx} onClick={() => setLightbox(url)} className="block">
                <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-40 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phản hồi */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Phản hồi của admin</h3>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
          placeholder="Nhập nội dung phản hồi (chỉ lưu vào hệ thống, không gửi email)…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <div className="flex justify-end mt-2">
          <Button variant="primary" disabled={saving || !reply.trim()} onClick={sendReply}>
            <Send className="w-4 h-4 mr-1" /> {saving ? "Đang lưu…" : "Lưu phản hồi"}
          </Button>
        </div>
      </div>

      {/* Lightbox phóng to ảnh */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Phóng to" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-gray-600 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-gray-900 font-semibold">{value}</p>
    </div>
  );
}
