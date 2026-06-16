import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, MapPin, Calendar, User, Image as ImageIcon } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import { getAnomalies, getPlots, updateAnomaly } from "../../lib/queries";

export function AnomalyDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [anomaly, setAnomaly] = useState<any>(null);
  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anomalyList, plotList] = await Promise.all([getAnomalies(), getPlots()]);
        setAnomaly(anomalyList.find(a => a.id === id));
        setPlots(plotList);
      } catch (error) {
        console.error("Error fetching anomaly:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const changeStatus = async (status: string) => {
    if (!anomaly) return;
    setSaving(true);
    setActionError("");
    try {
      await updateAnomaly(anomaly.id, { status });
      setAnomaly((prev: any) => ({ ...prev, status }));
    } catch (error) {
      console.error("Error updating anomaly:", error);
      setActionError("Không cập nhật được trạng thái. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Đang tải…</div>;
  }

  if (!anomaly) {
    return <div>Không tìm thấy báo cáo bất thường</div>;
  }

  const plot = plots.find(p => (p.id ?? p.name) === anomaly.plotId);
  const plotLabel = plot ? (plot.block_name ?? plot.name ?? anomaly.plotId) : anomaly.plotId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/notifications")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Chi tiết báo cáo bất thường</h2>
          <p className="text-gray-600 mt-1">Mã báo cáo: {anomaly.id.toUpperCase()}</p>
        </div>
        {anomaly.status !== "resolved" && (
          <Button variant="primary" disabled={saving} onClick={() => changeStatus("resolved")}>
            {saving ? "Đang lưu…" : "Đánh dấu đã xử lý"}
          </Button>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{actionError}</div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h3>
              <StatusBadge status={anomaly.status}>
                {anomaly.status === "pending" ? "Chưa xử lý" :
                 anomaly.status === "in-progress" ? "Đang xử lý" : "Đã xử lý"}
              </StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Loại bất thường</span>
                </div>
                <p className="text-gray-900 font-semibold">{anomaly.type}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">Lô</span>
                </div>
                <p className="text-gray-900 font-semibold">{plotLabel}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <span className="text-sm font-medium">Cây trồng</span>
                </div>
                <p className="text-gray-900 font-semibold">{anomaly.crop}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Ngày báo cáo</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {new Date(anomaly.date).toLocaleDateString("vi-VN")}
                </p>
              </div>

              <div className="col-span-2">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Người báo cáo</span>
                </div>
                <p className="text-gray-900 font-semibold">{anomaly.reporter}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mô tả chi tiết</h3>
            <p className="text-gray-700">{anomaly.description}</p>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Hình ảnh ({(anomaly.photos ?? []).length})</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(anomaly.photos ?? []).map((photo: string, idx: number) => (
                <img
                  key={idx}
                  src={photo}
                  alt={`Ảnh bất thường ${idx + 1}`}
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions & Timeline */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác</h3>
            <div className="space-y-3">
              <Button variant="primary" className="w-full">
                Gán cho kỹ thuật viên
              </Button>
              <Button variant="secondary" className="w-full">
                Thêm ghi chú
              </Button>
              <Button variant="secondary" className="w-full">
                Tạo công việc khắc phục
              </Button>
              {anomaly.status !== "resolved" && (
                <Button variant="ghost" className="w-full" disabled={saving} onClick={() => changeStatus("resolved")}>
                  Đóng báo cáo
                </Button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lịch sử xử lý</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Báo cáo được tạo</p>
                  <p className="text-xs text-gray-500">
                    {new Date(anomaly.date).toLocaleString("vi-VN")}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Bởi {anomaly.reporter}</p>
                </div>
              </div>
              {anomaly.status === "in-progress" && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Bắt đầu xử lý</p>
                    <p className="text-xs text-gray-500">14/06/2026 10:00</p>
                    <p className="text-xs text-gray-600 mt-1">Bởi Kỹ thuật viên A</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
