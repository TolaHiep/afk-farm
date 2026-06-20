import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Camera, CheckCircle, AlertTriangle, ChevronRight, ClipboardList, Trash2, Loader2 } from "lucide-react";
import { submitReport, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid, currentQueueBytes, withinBudget, OFFLINE_BUDGET } from "../../lib/offline";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { compressImage, dataUrlBytes, ONLINE, OFFLINE } from "../../lib/image";

const ANOMALY_TYPES = [
  { value: "ung", label: "Úng nước" },
  { value: "han", label: "Hạn hán" },
  { value: "sau-benh", label: "Sâu bệnh" },
  { value: "hong-gian", label: "Hỏng giàn" },
  { value: "khac", label: "Khác" },
];

// Một mục báo cáo = (Lô × Cây). Mô hình xen canh nên mỗi lô có thể có 2 mục
// (Gấc tầng giàn + Sâm dưới tán), mỗi cây là một quy trình riêng -> báo cáo riêng.
type ReportItem = { id: string; plotId: string; plotName: string; crop: string };

// Nhãn màu cho từng tầng cây
function getCropChip(crop: string): string {
  switch (crop) {
    case "Gấc":
      return "bg-orange-100 text-orange-800";
    case "Sâm":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function DailyReport() {
  const navigate = useNavigate();

  // Fetch logged-in leader's plots from API
  const [myPlots, setMyPlots] = React.useState<any[]>([]);

  React.useEffect(() => {
    getMyPlots().then(setMyPlots);
  }, []);

  // Danh sách mục báo cáo (Lô × Cây) do tổ trưởng phụ trách
  const reportItems = React.useMemo<ReportItem[]>(
    () =>
      myPlots.flatMap((plot) =>
        (plot.crops as string[]).map((c: string) => ({
          id: `${plot.id}__${c}`,
          plotId: plot.id,
          plotName: plot.name,
          crop: c,
        }))
      ),
    [myPlots]
  );

  // State cục bộ: mục (lô×cây) nào đã báo cáo
  const [reportedIds, setReportedIds] = React.useState<string[]>([]);
  // Mục đang mở form (null = đang xem danh sách)
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);

  // State của form lô hiện tại
  const [work, setWork] = React.useState("");
  const [area, setArea] = React.useState("");
  const [hasAnomaly, setHasAnomaly] = React.useState(false);
  const [anomalyType, setAnomalyType] = React.useState("");
  const [anomalyDesc, setAnomalyDesc] = React.useState("");
  const picker = usePhotoPicker();
  const [submitting, setSubmitting] = React.useState(false);

  const total = reportItems.length;
  const doneCount = reportedIds.length;
  const activeItem = reportItems.find((it) => it.id === activeItemId) || null;

  const resetForm = () => {
    setWork("");
    setArea("");
    setHasAnomaly(false);
    setAnomalyType("");
    setAnomalyDesc("");
    picker.clear();
  };

  const openItem = (itemId: string) => {
    resetForm();
    setActiveItemId(itemId);
  };

  const backToList = () => {
    setActiveItemId(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || submitting) return;

    if (hasAnomaly && !anomalyType) {
      alert("Vui lòng chọn loại bất thường.");
      return;
    }
    if (hasAnomaly && !anomalyDesc.trim()) {
      alert("Vui lòng nhập mô tả bất thường.");
      return;
    }
    if (hasAnomaly && picker.files.length === 0) {
      alert("Vui lòng chụp ảnh bất thường.");
      return;
    }
    // Không cho gửi báo cáo trống: phải nhập số công / diện tích, hoặc báo bất thường
    if (!hasAnomaly && !work.trim() && !area.trim()) {
      alert("Vui lòng nhập số công hoặc diện tích (hoặc bật Bất thường) trước khi gửi.");
      return;
    }

    // Soạn nội dung báo cáo từ các trường của form
    const lines = [
      work ? `Số công làm việc: ${work}` : "",
      area ? `Diện tích hoàn thành (m²): ${area}` : "",
      hasAnomaly ? `Bất thường (${anomalyType}): ${anomalyDesc.trim()}` : "",
    ].filter(Boolean);
    const content = lines.join("\n");

    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const clientUuid = `${activeItem.id}-${uid()}`;

    setSubmitting(true);
    try {
      const photos = hasAnomaly
        ? await Promise.all(picker.files.map((f) => compressImage(f, ONLINE.maxDim, ONLINE.quality)))
        : undefined;
      const payload = {
        block: activeItem.plotId, crop: activeItem.crop, date, content,
        photos, abnormal: hasAnomaly ? 1 : 0, client_uuid: clientUuid,
      };
      await submitReport(payload);
      setReportedIds((prev) => (prev.includes(activeItem.id) ? prev : [...prev, activeItem.id]));
      navigate("/mobile/success");
    } catch (err: any) {
      if (isNetworkError(err)) {
        const small = hasAnomaly
          ? await Promise.all(picker.files.map((f) => compressImage(f, OFFLINE.maxDim, OFFLINE.quality)))
          : undefined;
        const adding = (small ?? []).reduce((s, d) => s + dataUrlBytes(d), 0);
        if (!withinBudget(currentQueueBytes(), adding, OFFLINE_BUDGET)) {
          alert("Bộ nhớ offline gần đầy. Hãy bớt ảnh hoặc thử lại khi có mạng.");
          setSubmitting(false);
          return;
        }
        const payload = {
          block: activeItem.plotId, crop: activeItem.crop, date, content,
          photos: small, abnormal: hasAnomaly ? 1 : 0, client_uuid: clientUuid,
        };
        enqueueOffline({
          id: clientUuid, kind: "report", payload,
          title: `${activeItem.plotName} · ${activeItem.crop}`,
          date: new Date().toISOString(),
        });
        setReportedIds((prev) => (prev.includes(activeItem.id) ? prev : [...prev, activeItem.id]));
        navigate("/mobile/success");
      } else {
        alert(err?.message || "Gửi báo cáo thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Màn hình form nhập báo cáo cho 1 mục (lô × cây) =====
  if (activeItem) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-green-600 text-white p-4">
          <button onClick={backToList} className="mb-3">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">
            Báo cáo: {activeItem.plotName} · {activeItem.crop}
          </h1>
          <p className="text-green-100 mt-1">Cây trồng: {activeItem.crop}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Số liệu sản xuất */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold text-gray-900 mb-3">Số liệu sản xuất</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Số công làm việc hôm nay
                </label>
                <input
                  type="number"
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                  className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-lg"
                  placeholder="Ví dụ: 8"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Diện tích hoàn thành (m²)
                </label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-lg"
                  placeholder="Ví dụ: 5000"
                />
              </div>
            </div>
          </div>

          {/* Bất thường */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="font-bold text-gray-900">Có bất thường?</label>
              <button
                type="button"
                onClick={() => setHasAnomaly(!hasAnomaly)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  hasAnomaly ? "bg-red-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    hasAnomaly ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {hasAnomaly && (
              <div className="space-y-3 pt-3 border-t border-gray-200">
                {/* Loại bất thường */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loại bất thường *
                  </label>
                  <select
                    value={anomalyType}
                    onChange={(e) => setAnomalyType(e.target.value)}
                    className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-lg"
                  >
                    <option value="">Chọn loại bất thường</option>
                    {ANOMALY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mô tả */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mô tả chi tiết *
                  </label>
                  <textarea
                    value={anomalyDesc}
                    onChange={(e) => setAnomalyDesc(e.target.value)}
                    className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-base"
                    rows={3}
                    placeholder="Mô tả tình trạng bất thường..."
                  />
                </div>

                {/* Ảnh bắt buộc */}
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-red-900">
                      Bắt buộc chụp ảnh bất thường
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={picker.open}
                    className="w-full py-3 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Camera className="w-5 h-5" /> Thêm ảnh
                    </span>
                  </button>
                  <input {...picker.inputProps} />
                  {picker.files.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {picker.thumbs.map((src, i) => (
                        <div key={src} className="relative">
                          <img src={src} alt="" className="w-full h-20 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => picker.removeAt(i)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nút gửi */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {submitting ? "Đang gửi..." : "Gửi báo cáo lô này"}
          </button>
        </form>
      </div>
    );
  }

  // ===== Màn hình danh sách lô =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <button onClick={() => navigate("/mobile/tasks")} className="mb-3">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Báo cáo cuối ngày</h1>
        <p className="text-green-100 mt-1">
          Báo cáo riêng theo từng cây trên mỗi lô (xen canh)
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Tiến độ */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-gray-900">Tiến độ báo cáo</span>
            <span className="font-bold text-green-700">
              Đã báo cáo {doneCount}/{total} mục
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{ width: total ? `${(doneCount / total) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* Danh sách mục báo cáo (lô × cây) */}
        <div className="space-y-3">
          {reportItems.map((item) => {
            const reported = reportedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => !reported && openItem(item.id)}
                disabled={reported}
                className={`w-full text-left bg-white rounded-xl shadow p-4 flex items-center justify-between transition-colors ${
                  reported ? "opacity-80" : "hover:bg-green-50 active:bg-green-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center ${
                      reported ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    {reported ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <ClipboardList className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {item.plotName} · {item.crop}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${getCropChip(
                          item.crop
                        )}`}
                      >
                        Cây: {item.crop}
                      </span>
                      <span
                        className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                          reported
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {reported ? "Đã báo cáo" : "Chưa báo cáo"}
                      </span>
                    </div>
                  </div>
                </div>
                {!reported && <ChevronRight className="w-6 h-6 text-gray-400" />}
              </button>
            );
          })}
        </div>

        {/* Hoàn tất */}
        {total > 0 && doneCount === total && (
          <button
            type="button"
            onClick={() => navigate("/mobile/success")}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg"
          >
            Hoàn tất báo cáo
          </button>
        )}
      </div>
    </div>
  );
}
