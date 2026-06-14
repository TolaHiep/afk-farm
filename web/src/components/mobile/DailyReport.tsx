import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Camera, CheckCircle, AlertTriangle } from "lucide-react";

export function DailyReport() {
  const navigate = useNavigate();
  const [hasAnomaly, setHasAnomaly] = React.useState(false);
  const [anomalyType, setAnomalyType] = React.useState("");
  const [anomalyPhoto, setAnomalyPhoto] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasAnomaly && !anomalyType) {
      alert("Vui lòng chọn loại bất thường!");
      return;
    }
    
    if (hasAnomaly && !anomalyPhoto) {
      alert("Bạn cần chụp ảnh bất thường!");
      return;
    }
    
    navigate("/mobile/success");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <button onClick={() => navigate("/mobile/tasks")} className="mb-3">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Báo cáo cuối ngày</h1>
        <p className="text-green-100 mt-1">Thứ 7, 14/06/2026</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Production Data */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-900 mb-3">Số liệu sản xuất</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Số công làm việc hôm nay
              </label>
              <input
                type="number"
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
                className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-lg"
                placeholder="Ví dụ: 5000"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block font-bold text-gray-900 mb-2">
            Ghi chú (nếu có)
          </label>
          <textarea
            className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-base"
            rows={3}
            placeholder="Nhập ghi chú về công việc hôm nay..."
          />
        </div>

        {/* Anomaly Toggle */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="font-bold text-gray-900">
              Có bất thường?
            </label>
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
              {/* Anomaly Type */}
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
                  <option value="ung">Úng nước</option>
                  <option value="han">Hạn hán</option>
                  <option value="sau-benh">Sâu bệnh</option>
                  <option value="hong-gian">Hỏng giàn</option>
                  <option value="khac">Khác</option>
                </select>
              </div>

              {/* Anomaly Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mô tả chi tiết *
                </label>
                <textarea
                  className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-base"
                  rows={3}
                  placeholder="Mô tả tình trạng bất thường..."
                  required={hasAnomaly}
                />
              </div>

              {/* Photo Required */}
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

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg"
        >
          Gửi báo cáo
        </button>
      </form>
    </div>
  );
}
