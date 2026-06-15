import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Camera, CheckCircle, AlertTriangle, ChevronRight, ClipboardList } from "lucide-react";
import { leaderPlots, plotName } from "../../lib/mockData";

const ANOMALY_TYPES = [
  { value: "ung", label: "Úng nước" },
  { value: "han", label: "Hạn hán" },
  { value: "sau-benh", label: "Sâu bệnh" },
  { value: "hong-gian", label: "Hỏng giàn" },
  { value: "khac", label: "Khác" },
];

export function DailyReport() {
  const navigate = useNavigate();

  // Danh sách lô do tổ trưởng tl1 phụ trách
  const myPlots = React.useMemo(() => leaderPlots("tl1"), []);

  // State cục bộ: lô nào đã báo cáo
  const [reportedIds, setReportedIds] = React.useState<string[]>([]);
  // Lô đang mở form (null = đang xem danh sách)
  const [activePlotId, setActivePlotId] = React.useState<string | null>(null);

  // State của form lô hiện tại
  const [work, setWork] = React.useState("");
  const [area, setArea] = React.useState("");
  const [hasAnomaly, setHasAnomaly] = React.useState(false);
  const [anomalyType, setAnomalyType] = React.useState("");
  const [anomalyDesc, setAnomalyDesc] = React.useState("");
  const [anomalyPhoto, setAnomalyPhoto] = React.useState(false);

  const total = myPlots.length;
  const doneCount = reportedIds.length;
  const activePlot = myPlots.find((p) => p.id === activePlotId) || null;

  const resetForm = () => {
    setWork("");
    setArea("");
    setHasAnomaly(false);
    setAnomalyType("");
    setAnomalyDesc("");
    setAnomalyPhoto(false);
  };

  const openPlot = (plotId: string) => {
    resetForm();
    setActivePlotId(plotId);
  };

  const backToList = () => {
    setActivePlotId(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlot) return;

    if (hasAnomaly && !anomalyType) {
      alert("Vui lòng chọn loại bất thường!");
      return;
    }
    if (hasAnomaly && !anomalyDesc.trim()) {
      alert("Vui lòng nhập mô tả bất thường!");
      return;
    }
    if (hasAnomaly && !anomalyPhoto) {
      alert("Bạn cần chụp ảnh bất thường!");
      return;
    }

    setReportedIds((prev) =>
      prev.includes(activePlot.id) ? prev : [...prev, activePlot.id]
    );
    alert(`Đã gửi báo cáo cho ${activePlot.name}!`);
    backToList();
  };

  // ===== Màn hình form nhập báo cáo cho 1 lô =====
  if (activePlot) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-green-600 text-white p-4">
          <button onClick={backToList} className="mb-3">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Báo cáo: {activePlot.name}</h1>
          <p className="text-green-100 mt-1">Cây trồng: {activePlot.crop}</p>
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
                    onClick={() => setAnomalyPhoto(!anomalyPhoto)}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      anomalyPhoto
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {anomalyPhoto ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Đã chụp ảnh
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Camera className="w-5 h-5" />
                        Chụp ảnh ngay
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nút gửi */}
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg"
          >
            Gửi báo cáo lô này
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
        <p className="text-green-100 mt-1">Báo cáo theo từng lô phụ trách</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Tiến độ */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-gray-900">Tiến độ báo cáo</span>
            <span className="font-bold text-green-700">
              Đã báo cáo {doneCount}/{total} lô
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{ width: total ? `${(doneCount / total) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* Danh sách lô */}
        <div className="space-y-3">
          {myPlots.map((plot) => {
            const reported = reportedIds.includes(plot.id);
            return (
              <button
                key={plot.id}
                type="button"
                onClick={() => !reported && openPlot(plot.id)}
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
                    <p className="font-bold text-gray-900 text-lg">{plotName(plot.id)}</p>
                    <p className="text-sm text-gray-500">Cây trồng: {plot.crop}</p>
                    <span
                      className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        reported
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {reported ? "Đã báo cáo" : "Chưa báo cáo"}
                    </span>
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
