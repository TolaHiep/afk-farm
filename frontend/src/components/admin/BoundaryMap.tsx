import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Undo2, Trash2, Search, Crosshair, Navigation } from "lucide-react";
import { Button } from "../ui/button";
import { geodesicArea } from "../../lib/geo";
import { locateMe } from "../../lib/locate";
import { addBasemapSwitcher } from "../../lib/basemap";

type Pt = { lat: number; lng: number };

// Ray casting — kiểm tra điểm có nằm trong polygon không (dùng để chặn vẽ ra ngoài vùng cha)
function pointInPolygon(pt: Pt, poly: Pt[]): boolean {
  if (poly.length < 3) return false;
  const x = pt.lng, y = pt.lat;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Hai đa giác có chồng lấn không (heuristic: đỉnh của cái này nằm trong cái kia) — đủ để cảnh báo
function polygonsOverlap(a: Pt[], b: Pt[]): boolean {
  if (a.length < 3 || b.length < 3) return false;
  return a.some((p) => pointInPolygon(p, b)) || b.some((p) => pointInPolygon(p, a));
}

export function BoundaryMap({
  onChange,
  initial,
  constraint,
  splitPreview,
  avoid,
  warnOverlap,
}: {
  onChange?: (area: number, points: Pt[]) => void;
  // Ranh giới đã lưu (dùng khi sửa) — nạp sẵn lên map
  initial?: Pt[];
  // Vùng cha — bắt buộc các điểm phải nằm trong polygon này (lô trong vùng)
  constraint?: Pt[];
  splitPreview?: { label: string; polygon: Pt[] }[];
  // Các vùng đã có — hiển thị trên map (đỏ nét đứt) + chặn vẽ điểm vào trong (tránh chồng lấn)
  avoid?: { label?: string; polygon: Pt[] }[];
  // Các lô khác trong vùng — hiển thị (xanh nét đứt) + cảnh báo nếu chồng lấn, KHÔNG chặn
  warnOverlap?: { label?: string; polygon: Pt[] }[];
}) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const layerRef = React.useRef<L.LayerGroup | null>(null);
  const constraintLayerRef = React.useRef<L.LayerGroup | null>(null);
  const previewLayerRef = React.useRef<L.LayerGroup | null>(null);
  const avoidLayerRef = React.useRef<L.LayerGroup | null>(null);
  const warnLayerRef = React.useRef<L.LayerGroup | null>(null);
  const [points, setPoints] = React.useState<Pt[]>(initial ?? []);
  const [area, setArea] = React.useState(0);

  const [search, setSearch] = React.useState("");
  const [coord, setCoord] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [warn, setWarn] = React.useState("");
  const [searching, setSearching] = React.useState(false);

  // Ref tới constraint mới nhất để event handler trong useEffect-init không bị stale
  const constraintRef = React.useRef<Pt[] | undefined>(constraint);
  React.useEffect(() => { constraintRef.current = constraint; }, [constraint]);

  // Ref tới splitPreview mới nhất để click handler trong useEffect-init không bị stale
  const splitPreviewRef = React.useRef(splitPreview);
  React.useEffect(() => { splitPreviewRef.current = splitPreview; }, [splitPreview]);

  // Ref tới avoid mới nhất để click/drag handler trong useEffect-init không bị stale
  const avoidRef = React.useRef(avoid);
  React.useEffect(() => { avoidRef.current = avoid; }, [avoid]);

  // Đồng bộ points khi initial đổi (form async load xong mới có polygon)
  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (seededRef.current) return;
    if (initial && initial.length >= 3) {
      setPoints(initial);
      seededRef.current = true;
    }
  }, [initial]);

  // Khởi tạo bản đồ 1 lần (tắt attribution theo yêu cầu)
  React.useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center: [11.9404, 108.4583], zoom: 16, attributionControl: false });
    addBasemapSwitcher(map);
    constraintLayerRef.current = L.layerGroup().addTo(map);
    avoidLayerRef.current = L.layerGroup().addTo(map);
    warnLayerRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    previewLayerRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (splitPreviewRef.current && splitPreviewRef.current.length) return; // chế độ xem trước: chỉ đọc
      const p = { lat: e.latlng.lat, lng: e.latlng.lng };
      const c = constraintRef.current;
      if (c && c.length >= 3 && !pointInPolygon(p, c)) {
        setMsg("Điểm phải nằm trong ranh giới vùng cha (vùng vàng trên bản đồ).");
        return;
      }
      const av = avoidRef.current;
      if (av && av.some((z) => z.polygon.length >= 3 && pointInPolygon(p, z.polygon))) {
        setMsg("Điểm nằm trong vùng đã có — không được chồng lấn. Hãy vẽ ra ngoài các vùng hiện có (đỏ).");
        return;
      }
      setMsg("");
      setPoints((prev) => [...prev, p]);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Vẽ vùng cha + canh khung nhìn vào vùng cha hoặc polygon ban đầu
  React.useEffect(() => {
    const map = mapRef.current, cLayer = constraintLayerRef.current;
    if (!map || !cLayer) return;
    cLayer.clearLayers();
    if (constraint && constraint.length >= 3) {
      const latlngs = constraint.map((p) => [p.lat, p.lng] as [number, number]);
      L.polygon(latlngs, {
        color: "#f59e0b", weight: 2, dashArray: "6,4",
        fillColor: "#f59e0b", fillOpacity: 0.06, interactive: false,
      }).addTo(cLayer);
      map.fitBounds(L.latLngBounds(latlngs), { padding: [20, 20], maxZoom: 18 });
    } else if (initial && initial.length >= 3) {
      const latlngs = initial.map((p) => [p.lat, p.lng] as [number, number]);
      map.fitBounds(L.latLngBounds(latlngs), { padding: [20, 20], maxZoom: 18 });
    }
  }, [constraint, initial]);

  // Vẽ lại đa giác + tính diện tích mỗi khi điểm thay đổi
  React.useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (splitPreview && splitPreview.length) { onChange?.(0, []); return; } // đang xem trước: không vẽ tay
    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    if (points.length >= 3) {
      L.polygon(latlngs, { color: "#16a34a", weight: 2, fillColor: "#16a34a", fillOpacity: 0.25 }).addTo(layer);
    } else if (points.length === 2) {
      L.polyline(latlngs, { color: "#16a34a", weight: 2, dashArray: "4" }).addTo(layer);
    }
    const dotIcon = L.divIcon({ className: "akf-vertex", iconSize: [14, 14] });
    points.forEach((p, idx) => {
      const mk = L.marker([p.lat, p.lng], { draggable: true, icon: dotIcon }).addTo(layer);
      // Kéo thả để chỉnh lại vị trí góc — chặn ra ngoài ranh giới vùng cha
      mk.on("dragend", () => {
        const ll = mk.getLatLng();
        const next = { lat: ll.lat, lng: ll.lng };
        const c = constraintRef.current;
        if (c && c.length >= 3 && !pointInPolygon(next, c)) {
          mk.setLatLng([p.lat, p.lng]); // revert về vị trí cũ
          setMsg("Điểm phải nằm trong ranh giới vùng cha (vùng vàng trên bản đồ).");
          return;
        }
        const av = avoidRef.current;
        if (av && av.some((z) => z.polygon.length >= 3 && pointInPolygon(next, z.polygon))) {
          mk.setLatLng([p.lat, p.lng]); // revert
          setMsg("Điểm nằm trong vùng đã có — không được chồng lấn.");
          return;
        }
        setMsg("");
        setPoints((prev) => prev.map((q, i) => (i === idx ? next : q)));
      });
    });
    const a = Math.round(geodesicArea(points));
    setArea(a);
    onChange?.(a, points);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  // Vẽ xem trước chia lô (chỉ đọc) + canh khung nhìn
  React.useEffect(() => {
    const map = mapRef.current, layer = previewLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!splitPreview || !splitPreview.length) return;
    const all: [number, number][] = [];
    splitPreview.forEach((item, i) => {
      const latlngs = item.polygon.map((p) => [p.lat, p.lng] as [number, number]);
      all.push(...latlngs);
      L.polygon(latlngs, {
        color: "#2563eb", weight: 2,
        fillColor: i % 2 ? "#3b82f6" : "#60a5fa", fillOpacity: 0.25,
      }).addTo(layer);
      const c = latlngs.reduce((acc, [la, ln]) => [acc[0] + la, acc[1] + ln], [0, 0]);
      const center: [number, number] = [c[0] / latlngs.length, c[1] / latlngs.length];
      L.marker(center, {
        interactive: false,
        icon: L.divIcon({ className: "akf-plot-label", html: `<span>${item.label}</span>` }),
      }).addTo(layer);
    });
    if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [20, 20], maxZoom: 18 });
  }, [splitPreview]);

  // Vẽ các vùng đã có (chỉ đọc, đỏ nét đứt) để tránh chồng lấn khi tạo vùng mới
  React.useEffect(() => {
    const map = mapRef.current, layer = avoidLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!avoid || !avoid.length) return;
    const all: [number, number][] = [];
    avoid.forEach((z) => {
      if (z.polygon.length < 3) return;
      const latlngs = z.polygon.map((p) => [p.lat, p.lng] as [number, number]);
      all.push(...latlngs);
      L.polygon(latlngs, {
        color: "#ef4444", weight: 1.5, dashArray: "5,4",
        fillColor: "#ef4444", fillOpacity: 0.08, interactive: false,
      }).addTo(layer);
      if (z.label) {
        const c = latlngs.reduce((acc, [la, ln]) => [acc[0] + la, acc[1] + ln], [0, 0]);
        L.marker([c[0] / latlngs.length, c[1] / latlngs.length], {
          interactive: false,
          icon: L.divIcon({ className: "akf-plot-label", html: `<span>${z.label}</span>` }),
        }).addTo(layer);
      }
    });
    // Chưa vẽ tay & không có ranh giới sẵn -> canh khung nhìn để thấy các vùng đã có
    if (all.length && points.length === 0 && (!initial || initial.length < 3) && (!constraint || constraint.length < 3)) {
      map.fitBounds(L.latLngBounds(all), { padding: [30, 30], maxZoom: 17 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avoid]);

  // Vẽ các lô khác trong vùng (xanh nét đứt) — chỉ tham chiếu, KHÔNG chặn
  React.useEffect(() => {
    const layer = warnLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    (warnOverlap || []).forEach((z) => {
      if (z.polygon.length < 3) return;
      const latlngs = z.polygon.map((p) => [p.lat, p.lng] as [number, number]);
      L.polygon(latlngs, {
        color: "#2563eb", weight: 1.5, dashArray: "5,4",
        fillColor: "#3b82f6", fillOpacity: 0.08, interactive: false,
      }).addTo(layer);
      if (z.label) {
        const c = latlngs.reduce((acc, [la, ln]) => [acc[0] + la, acc[1] + ln], [0, 0]);
        L.marker([c[0] / latlngs.length, c[1] / latlngs.length], {
          interactive: false,
          icon: L.divIcon({ className: "akf-plot-label", html: `<span>${z.label}</span>` }),
        }).addTo(layer);
      }
    });
  }, [warnOverlap]);

  // Cảnh báo (không chặn) khi ranh giới đang vẽ chồng lấn lô khác trong vùng
  React.useEffect(() => {
    if (points.length < 3 || !warnOverlap || !warnOverlap.length) { setWarn(""); return; }
    const hit = warnOverlap.filter((z) => polygonsOverlap(points, z.polygon)).map((z) => z.label).filter(Boolean);
    setWarn(hit.length ? `Ranh giới đang chồng lấn lô: ${hit.join(", ")}. Vẫn lưu được, nhưng nên chỉnh lại để không đè lô khác.` : "");
  }, [points, warnOverlap]);

  // Tìm khu vực theo tên (OpenStreetMap Nominatim — miễn phí, không cần key)
  const doSearch = async () => {
    const q = search.trim();
    if (!q || !mapRef.current) return;
    setSearching(true);
    setMsg("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data && data.length) {
        mapRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 17);
      } else {
        setMsg("Không tìm thấy khu vực này.");
      }
    } catch {
      setMsg("Lỗi kết nối khi tìm kiếm.");
    } finally {
      setSearching(false);
    }
  };

  // Nhảy tới tọa độ chính xác: "vĩ độ, kinh độ"
  const goToCoord = () => {
    if (!mapRef.current) return;
    const m = coord.split(/[,\s]+/).map((s) => parseFloat(s)).filter((n) => !Number.isNaN(n));
    if (m.length < 2) {
      setMsg("Nhập đúng dạng: vĩ độ, kinh độ (vd 11.9404, 108.4583).");
      return;
    }
    const [lat, lng] = m;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setMsg("Tọa độ ngoài phạm vi hợp lệ.");
      return;
    }
    setMsg("");
    mapRef.current.setView([lat, lng], 18);
  };

  // Vị trí của tôi (GPS) — canh để thấy cả mình lẫn ranh giới vùng cha / điểm đang vẽ / vùng đã có
  const goToMyLocation = () => {
    if (!mapRef.current) return;
    setMsg("");
    const ref = constraintRef.current?.length ? constraintRef.current
      : points.length ? points
      : (avoidRef.current || []).flatMap((a) => a.polygon);
    locateMe(mapRef.current, { onError: setMsg, fitWith: ref.map((p) => [p.lat, p.lng]) });
  };

  return (
    <div>
      {/* Thanh tìm kiếm khu vực + nhập tọa độ */}
      <div className="mb-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), doSearch())}
            placeholder="Tìm khu vực (vd: Đà Lạt, Lâm Đồng)..."
            className="w-full pl-9 pr-20 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <Button variant="primary" size="sm" onClick={doSearch} disabled={searching}
            className="absolute right-1 top-1/2 -translate-y-1/2">
            {searching ? "Đang tìm..." : "Tìm"}
          </Button>
        </div>
        <div className="relative sm:w-72">
          <Crosshair className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={coord}
            onChange={(e) => setCoord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), goToCoord())}
            placeholder="Tọa độ: vĩ độ, kinh độ"
            className="w-full pl-9 pr-20 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <Button variant="secondary" size="sm" onClick={goToCoord}
            className="absolute right-1 top-1/2 -translate-y-1/2">
            Đi tới
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={goToMyLocation} className="whitespace-nowrap">
          <Navigation className="w-4 h-4 mr-1" /> Vị trí của tôi
        </Button>
      </div>
      {msg && <p className="text-xs text-red-600 mb-2">{msg}</p>}
      {warn && <p className="text-xs text-amber-600 mb-2">⚠️ {warn}</p>}

      <div ref={elRef} className="w-full h-[clamp(320px,52vh,460px)] rounded-lg overflow-hidden border border-gray-200 relative z-0" />
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
