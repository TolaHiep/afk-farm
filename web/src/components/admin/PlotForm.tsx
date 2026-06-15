import React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { BoundaryMap } from "./BoundaryMap";
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vẽ ranh giới trên bản đồ (ảnh vệ tinh)</h3>
            <p className="text-sm text-gray-500 mt-1">
              Bấm lần lượt lên các góc của {isZone ? "vùng" : "lô"} trên ảnh vệ tinh — hệ thống tự nối ranh giới và tính diện tích thực theo GPS.
            </p>
          </div>

          <BoundaryMap onChange={(a) => setArea(a)} />

          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Hướng dẫn:</strong> Cuộn/kéo bản đồ tới khu đất, bấm lần lượt các góc để tạo ranh giới (cần ít nhất 3 điểm).
              Diện tích được tính tự động và điền vào ô bên trái. Dùng "Hoàn tác" để bỏ điểm cuối, "Xóa hết" để vẽ lại.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
