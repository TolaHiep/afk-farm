import React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "../ui/button";
import { zones, teamLeaders } from "../../lib/mockData";

export function PlotForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "plot";
  const isZone = type === "zone";

  // Vùng cha đã chọn sẵn khi bấm "Thêm lô" từ thẻ vùng
  const presetZone = zones.find((z) => z.id === searchParams.get("zone"));

  const [area, setArea] = React.useState<number>(0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/zones")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {isZone ? "Thêm vùng mới" : presetZone ? `Thêm lô vào ${presetZone.name}` : "Thêm lô mới"}
        </h2>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 border border-gray-200">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isZone ? "Tên vùng" : "Tên lô"}
              </label>
              <input
                type="text"
                placeholder={isZone ? "Vùng E" : "Lô E1"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {!isZone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vùng cha
                </label>
                {presetZone ? (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between">
                    <span className="font-medium text-gray-800">{presetZone.name}</span>
                    <span className="text-xs text-green-600">Đã chọn từ thẻ vùng</span>
                  </div>
                ) : (
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="">
                    <option value="">Chọn vùng</option>
                    {zones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diện tích (m²)
              </label>
              <input
                type="number"
                value={area || ""}
                onChange={(e) => setArea(Number(e.target.value))}
                placeholder="10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Tự động tính từ ranh giới trên bản đồ
              </p>
            </div>

            {!isZone && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tổ trưởng
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Chọn tổ trưởng</option>
                    {teamLeaders.map(leader => (
                      <option key={leader.id} value={leader.id}>{leader.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại cây
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Chọn loại cây</option>
                    <option>Gấc</option>
                    <option>Sâm</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => navigate("/admin/zones")}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                Lưu
              </Button>
            </div>
          </form>
        </div>

        {/* Map Drawing */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vẽ ranh giới trên bản đồ</h3>
            <Button variant="secondary" size="sm">
              <MapPin className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Map Canvas */}
          <div className="relative w-full h-[500px] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Click để đánh dấu các điểm ranh giới</p>
              <p className="text-sm mt-1">Khu vực sẽ tự động được tính diện tích</p>
            </div>

            {/* Sample polygon if area is set */}
            {area > 0 && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <polygon
                  points="20,20 40,20 40,40 20,40"
                  fill="rgba(34, 197, 94, 0.2)"
                  stroke="#16a34a"
                  strokeWidth="0.5"
                />
                <circle cx="20" cy="20" r="1" fill="#16a34a" />
                <circle cx="40" cy="20" r="1" fill="#16a34a" />
                <circle cx="40" cy="40" r="1" fill="#16a34a" />
                <circle cx="20" cy="40" r="1" fill="#16a34a" />
              </svg>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Hướng dẫn:</strong> Click trên bản đồ để đánh dấu các góc của {isZone ? "vùng" : "lô"}. 
              Click vào điểm đầu tiên để hoàn thành đa giác. Diện tích sẽ được tự động tính toán.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
