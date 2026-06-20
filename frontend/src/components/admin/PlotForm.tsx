import React from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { BoundaryMap } from "./BoundaryMap";
import { getZones, getTeamLeaders, getPlot, createZone, createPlot, updatePlot, createPlotsBulk } from "../../lib/queries";
import { polygonFromGeoJSON, geodesicArea, type LatLng } from "../../lib/geo";
import {
  splitPolygonByWeights, equalWeights, keepSmallWeights,
  plotCountByArea, areaRemainder, splitLabels, defaultPrefix,
} from "../../lib/split";

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
  const [cropTags, setCropTags] = React.useState<string[]>([]);
  // Polygon đã lưu (khi sửa) — nạp vào BoundaryMap qua prop `initial`
  const [initialPoints, setInitialPoints] = React.useState<Pt[] | undefined>(undefined);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // --- Chia tự động ---
  const [autoMode, setAutoMode] = React.useState(false);
  const [splitBy, setSplitBy] = React.useState<"count" | "area">("count");
  const [splitCount, setSplitCount] = React.useState<number>(4);
  const [splitArea, setSplitArea] = React.useState<number>(1000);
  const [prefix, setPrefix] = React.useState("");
  const [startIndex, setStartIndex] = React.useState<number>(1);
  const [remainderMode, setRemainderMode] = React.useState<"even" | "keepSmall">("even");
  const [preview, setPreview] = React.useState<{ label: string; polygon: Pt[]; area: number }[] | null>(null);

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
          setCropTags(Array.isArray(p.cropTags) ? p.cropTags : []);
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

  // Khi tạo VÙNG mới: hiển thị các vùng đã có (đỏ) trên map + chặn vẽ chồng lấn
  const avoidZones = React.useMemo(() => {
    if (!isZone) return undefined;
    return zones
      .map((z) => ({ label: z.name as string, polygon: toPts(polygonFromGeoJSON(z.boundary)) }))
      .filter((z): z is { label: string; polygon: Pt[] } => !!z.polygon && z.polygon.length >= 3);
  }, [isZone, zones]);

  const selectedZone = React.useMemo(
    () => zones.find((z) => z.id === (searchParams.get("zone") || zoneId)),
    [zones, zoneId, searchParams]
  );
  React.useEffect(() => {
    if (autoMode && selectedZone && !prefix) setPrefix(defaultPrefix(selectedZone.name || ""));
  }, [autoMode, selectedZone, prefix]);

  const zoneArea = React.useMemo(
    () => (parentBoundary && parentBoundary.length >= 3 ? geodesicArea(parentBoundary) : 0),
    [parentBoundary]
  );

  const hasRemainder = splitBy === "area" && areaRemainder(zoneArea, splitArea) > 1;

  // Lý do chưa thể xem trước — hiện gợi ý nhẹ cho người dùng khi preview = null
  const previewHint = !autoMode
    ? null
    : (!parentBoundary || parentBoundary.length < 3)
      ? "Chọn vùng cha đã có ranh giới để xem trước."
      : splitBy === "count" && Math.floor(splitCount) < 1
        ? "Nhập số lô ≥ 1 để xem trước."
        : splitBy === "area" && !(splitArea > 0 && zoneArea > 0)
          ? "Nhập diện tích mỗi lô > 0 để xem trước."
          : null;

  // Tự động tính xem trước (debounce 350ms) mỗi khi đổi thông số chia — không cần bấm nút.
  // Chạy lại khi: số lô / diện tích / cách chia / phần dư / tiền tố / STT / vùng cha thay đổi.
  React.useEffect(() => {
    if (!autoMode) return;
    if (!parentBoundary || parentBoundary.length < 3) { setPreview(null); return; }
    if (splitBy === "count" && Math.floor(splitCount) < 1) { setPreview(null); return; }
    if (splitBy === "area" && !(splitArea > 0 && zoneArea > 0)) { setPreview(null); return; }
    const t = setTimeout(() => {
      const n = splitBy === "count" ? Math.max(1, Math.floor(splitCount)) : plotCountByArea(zoneArea, splitArea);
      const weights = splitBy === "count"
        ? equalWeights(n)
        : remainderMode === "keepSmall" ? keepSmallWeights(zoneArea, splitArea) : equalWeights(n);
      const parts = splitPolygonByWeights(parentBoundary, weights);
      const labels = splitLabels(prefix || "Lô", Math.max(1, Math.floor(startIndex)), parts.length);
      setPreview(parts.map((polygon, i) => ({ label: labels[i], polygon, area: Math.round(geodesicArea(polygon)) })));
    }, 350);
    return () => clearTimeout(t);
  }, [autoMode, splitBy, splitCount, splitArea, remainderMode, prefix, startIndex, parentBoundary, zoneArea]);

  const handleBulkCreate = async () => {
    if (!preview || !preview.length) return;
    setError("");
    setSaving(true);
    try {
      const plots = preview.map((p) => ({
        block_name: p.label,
        area: p.area,
        boundary: toGeoJSONPolygon(p.polygon),
        crops: cropTags,
      }));
      await createPlotsBulk(zoneId || (searchParams.get("zone") || ""), plots, teamLeader || undefined);
      navigate("/admin/zones");
    } catch (err: any) {
      setError(err?.message || "Tạo lô hàng loạt thất bại (có thể trùng tên lô).");
      setSaving(false);
    }
  };

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
        await updatePlot(id, { block_name: name, zone: zoneId, area, team_leader: teamLeader || undefined, boundary, crops: cropTags });
      } else if (isZone) {
        await createZone({ zone_name: name, area, boundary });
      } else {
        await createPlot({ block_name: name, zone: zoneId, area, team_leader: teamLeader || undefined, boundary, crops: cropTags });
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

      {/* Nút chuyển chế độ — chỉ khi thêm lô mới */}
      {!isEdit && !isZone && (
        <div className="flex gap-2">
          <Button type="button" variant={autoMode ? "secondary" : "primary"} onClick={() => { setAutoMode(false); setPreview(null); }}>
            Vẽ thủ công
          </Button>
          <Button type="button" variant={autoMode ? "primary" : "secondary"} onClick={() => setAutoMode(true)}>
            Chia tự động
          </Button>
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel chia tự động */}
        {autoMode && !isEdit && !isZone && (
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vùng cha</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={zoneId}
                onChange={(e) => { setZoneId(e.target.value); setPrefix(""); }}>
                <option value="">Chọn vùng</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Diện tích vùng: {zoneArea ? `${Math.round(zoneArea).toLocaleString()} m²` : "— (vùng chưa có ranh giới)"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cách chia</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="radio" checked={splitBy === "count"} onChange={() => setSplitBy("count")} /> Theo số lô</label>
                <label className="flex items-center gap-2"><input type="radio" checked={splitBy === "area"} onChange={() => setSplitBy("area")} /> Theo diện tích</label>
              </div>
            </div>

            {splitBy === "count" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lô</label>
                <input type="number" min={1} value={splitCount || ""} onChange={(e) => setSplitCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diện tích mỗi lô (m²)</label>
                <input type="number" min={1} value={splitArea || ""} onChange={(e) => setSplitArea(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                {hasRemainder && (
                  <div className="mt-2 p-2 bg-amber-50 rounded text-sm text-amber-800">
                    {Math.round(zoneArea).toLocaleString()} m² ÷ {splitArea.toLocaleString()} m² dư {Math.round(areaRemainder(zoneArea, splitArea)).toLocaleString()} m².
                    <div className="flex gap-3 mt-1">
                      <label className="flex items-center gap-1"><input type="radio" checked={remainderMode === "even"} onChange={() => setRemainderMode("even")} /> Chia đều ({Math.round(zoneArea / plotCountByArea(zoneArea, splitArea)).toLocaleString()} m²/lô)</label>
                      <label className="flex items-center gap-1"><input type="radio" checked={remainderMode === "keepSmall"} onChange={() => setRemainderMode("keepSmall")} /> Giữ lô nhỏ</label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiền tố tên</label>
                <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">STT bắt đầu</label>
                <input type="number" min={1} value={startIndex || ""} onChange={(e) => setStartIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cây trồng (áp cho tất cả lô)</label>
              <div className="flex gap-4">
                {["Gấc", "Sâm"].map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={cropTags.includes(c)}
                      onChange={(e) => setCropTags((prev) => e.target.checked ? [...prev, c] : prev.filter((x) => x !== c))} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tổ trưởng (áp cho tất cả)</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={teamLeader} onChange={(e) => setTeamLeader(e.target.value)}>
                <option value="">Chọn tổ trưởng</option>
                {leaders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="primary" className="flex-1" disabled={!preview || saving} onClick={handleBulkCreate}>
                {saving ? "Đang tạo..." : preview ? `Tạo ${preview.length} lô` : "Tạo lô"}
              </Button>
            </div>
            {preview
              ? <p className="text-xs text-gray-500">Xem trước {preview.length} lô — tự cập nhật khi đổi thông số. Bấm "Tạo" để lưu.</p>
              : previewHint && <p className="text-xs text-amber-600">{previewHint}</p>}
          </div>
        )}

        {/* Form Fields (chế độ vẽ thủ công) */}
        {!autoMode && (
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
                      Cây trồng
                    </label>
                    <div className="flex gap-4">
                      {["Gấc", "Sâm"].map((c) => (
                        <label key={c} className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={cropTags.includes(c)}
                            onChange={(e) =>
                              setCropTags((prev) =>
                                e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)
                              )
                            }
                          />
                          {c}
                        </label>
                      ))}
                    </div>
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
        )}

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
            constraint={autoMode ? undefined : parentBoundary}
            avoid={avoidZones}
            splitPreview={autoMode && preview ? preview.map((p) => ({ label: p.label, polygon: p.polygon })) : undefined}
          />

          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Hướng dẫn:</strong> Tìm khu vực hoặc nhập tọa độ để tới khu đất, bấm lần lượt các góc để tạo ranh giới (cần ít nhất 3 điểm).
              <strong> Kéo các điểm</strong> để chỉnh lại ranh giới — diện tích tự cập nhật. Dùng "Hoàn tác" để bỏ điểm cuối, "Xóa hết" để vẽ lại.
              {!isZone && parentBoundary && (
                <> <strong>Lô phải nằm trong ranh giới vùng cha</strong> (vùng vàng nét đứt) — các điểm ngoài vùng sẽ bị từ chối.</>
              )}
              {isZone && avoidZones && avoidZones.length > 0 && (
                <> <strong>Các vùng đã có hiện màu đỏ nét đứt</strong> — không vẽ chồng lên chúng (điểm rơi vào vùng đỏ sẽ bị từ chối).</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
