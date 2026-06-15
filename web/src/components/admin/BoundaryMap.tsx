import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Undo2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

type Pt = { lat: number; lng: number };

// Diện tích đa giác trên mặt cầu Trái Đất (m²) — công thức trắc địa như Leaflet.Draw
function geodesicArea(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  const R = 6378137; // bán kính Trái Đất (m)
  const d2r = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    area += (p2.lng - p1.lng) * d2r * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
  }
  return Math.abs((area * R * R) / 2);
}

export function BoundaryMap({ onChange }: { onChange?: (area: number, points: Pt[]) => void }) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const layerRef = React.useRef<L.LayerGroup | null>(null);
  const [points, setPoints] = React.useState<Pt[]>([]);
  const [area, setArea] = React.useState(0);

  // Khởi tạo bản đồ 1 lần
  React.useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center: [11.9404, 108.4583], zoom: 16 }); // mặc định: vùng Đà Lạt
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Ảnh vệ tinh © Esri" }
    ).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      setPoints((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Vẽ lại đa giác + tính diện tích mỗi khi điểm thay đổi
  React.useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    if (points.length >= 3) {
      L.polygon(latlngs, { color: "#16a34a", weight: 2, fillColor: "#16a34a", fillOpacity: 0.25 }).addTo(layer);
    } else if (points.length === 2) {
      L.polyline(latlngs, { color: "#16a34a", weight: 2, dashArray: "4" }).addTo(layer);
    }
    points.forEach((p) => {
      L.circleMarker([p.lat, p.lng], { radius: 5, color: "#fff", weight: 2, fillColor: "#16a34a", fillOpacity: 1 }).addTo(layer);
    });
    const a = Math.round(geodesicArea(points));
    setArea(a);
    onChange?.(a, points);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return (
    <div>
      <div ref={elRef} className="w-full h-[460px] rounded-lg overflow-hidden border border-gray-200 relative z-0" />
      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-gray-600">
          {points.length} điểm ·{" "}
          <span className="font-semibold text-green-700">
            {area.toLocaleString()} m² ({(area / 10000).toFixed(2)} ha)
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPoints((p) => p.slice(0, -1))} disabled={!points.length}>
            <Undo2 className="w-4 h-4 mr-1" /> Hoàn tác
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPoints([])} disabled={!points.length}>
            <Trash2 className="w-4 h-4 mr-1" /> Xóa hết
          </Button>
        </div>
      </div>
    </div>
  );
}
