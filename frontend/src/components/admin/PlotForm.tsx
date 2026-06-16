import React from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { BoundaryMap } from "./BoundaryMap";
import { getZones, getTeamLeaders, getPlot, createZone, createPlot, updatePlot } from "../../lib/queries";
import { polygonFromGeoJSON, type LatLng } from "../../lib/geo";

type Pt = { lat: number; lng: number };

// Chuyển polygon nội bộ ({lat,lng}[]) -> GeoJSON Polygon string để lưu vào field boundary
function toGeoJSONPolygon(points: Pt[]): string | undefined {
  if (points.length < 3) return undefined;
  const ring = points.map((p) => [p.lng, p.lat] as [number, number]);
  ring.push([ring[0][0], ring[0][1]]); // GeoJSON yêu cầu đóng vòng
  return JSON.stringify({ type: "Polygon", coordinates: [ring] });
}

// Chuyển [lat,lng][] (kết quả polygonFromGeoJSON) -> Pt[] cho BoundaryMap
function toPts(latlngs: LatLng[] | null): Pt[] | undefined {
  return latlngs ? latlngs.map(([lat, lng]) => ({ lat, lng })) : undefined;
}

export function PlotForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const isEdit = !!id;
  const type = searchParams.get("type") || "plot";
  // Khi sửa thì luôn là sửa lô
  const isZone = isEdit ? false : type === "zone";

  const [zones, setZones] = React.useState<any[]>([]);
  const [leaders, setLeaders] = React.useState<any[]>([]);

  const [name, setName] = React.useState("");
  const [zoneId, setZoneId] = React.useState(searchParams.get("zone") || "");
  const [teamLeader, setTeamLeader] = React.useState("");
  const [area, setArea] = React.useState<number>(0);
  const [points, setPoints] = React.useState<Pt[]>([]);
  // Polygon đã lưu (khi sửa) — nạp vào BoundaryMap qua prop `initial`
  const [initialPoints, setInitialPoints] = React.useState<Pt[] | undefined>(undefined);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [zs, ls] = await Promise.all([getZones(), getTeamLeaders()]);
        if (!alive) return;
        setZones(zs || []);
        setLeaders(ls || []);
      } catch (e: any) {
        if (alive) setError(e?.message || "Không tải được dữ liệu");
      }
      if (isEdit && id) {
        try {
          const p = await getPlot(id);
          if (!alive || !p) return;
          setName(p.name || "");
          setZoneId(p.zoneId || "");
          setTeamLeader(p.teamLeaderId || "");
          setArea(p.area || 0);
          const existing = toPts(polygonFromGeoJSON(p.boundary));
          if (existing) {
            setInitialPoints(existing);
            setPoints(existing);
          }
        } catch (e: any) {
          if (alive) setError(e?.message || "Không tải được dữ liệu lô");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [isEdit, id]);

  // Vùng cha đã chọn sẵn khi bấm "Thêm lô" từ thẻ vùng
  const presetZone = !isEdit ? zones.find((z) => z.id === searchParams.get("zone")) : undefined;

  // Ranh giới vùng cha (để chặn vẽ lô ra ngoài) — lấy theo zoneId hiện tại
  const parentBoundary = React.useMemo<Pt[] | undefined>(() => {
    if (isZone) return undefined;
    const z = zones.find((z) => z.id === zoneId);
    return toPts(polygonFromGeoJSON(z?.boundary));
  }, [isZone, zoneId, zones]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (points.length < 3) {
      setError("Vui lòng vẽ ranh giới trên bản đồ (ít nhất 3 điểm)");
      return;
    }
    const boundary = toGeoJSONPolygon(points);
    setSaving(true);
    try {
      if (isEdit && id) {
        await updatePlot(id, { block_name: name, zone: zoneId, area, team_leader: teamLeader || undefined, boundary });
      } else if (isZone) {
        await createZone({ zone_name: name, area, boundary });
      } else {
        await createPlot({ block_name: name, zone: zoneId, area, team_leader: teamLeader || undefined, boundary });
      }
      navigate("/admin/zones");
    } catch (err: any) {
      setError(err?.message || "Lưu thất bại, vui lòng thử lại");
      setSaving(false);
    }
  };

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
          {isEdit
            ? "Sửa lô"
            : isZone
              ? "Thêm vùng mới"
              : presetZone
                ? `Thêm lô vào ${presetZone.name}`
                : "Thêm lô mới"}
        </h2>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 border border-gray-200">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isZone ? "Tên vùng" : "Tên lô"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                  >
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
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={teamLeader}
                    onChange={(e) => setTeamLeader(e.target.value)}
                  >
                    <option value="">Chọn tổ trưởng</option>
                    {leaders.map(leader => (
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

            {error && (
              <p className="text-sm text-red-600">{error}</p>
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
              <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
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

          <BoundaryMap
            onChange={(a, pts) => { setArea(a); setPoints(pts); }}
            initial={initialPoints}
            constraint={parentBoundary}
          />

          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Hướng dẫn:</strong> Tìm khu vực hoặc nhập tọa độ để tới khu đất, bấm lần lượt các góc để tạo ranh giới (cần ít nhất 3 điểm).
              <strong> Kéo các điểm</strong> để chỉnh lại ranh giới — diện tích tự cập nhật. Dùng "Hoàn tác" để bỏ điểm cuối, "Xóa hết" để vẽ lại.
              {!isZone && parentBoundary && (
                <> <strong>Lô phải nằm trong ranh giới vùng cha</strong> (vùng vàng nét đứt) — các điểm ngoài vùng sẽ bị từ chối.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
