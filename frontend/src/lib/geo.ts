// Hình học cho bản đồ nhiệt: ưu tiên polygon thật (field `boundary` GeoJSON)
// từ DB; nếu vùng/lô chưa có ranh giới thì fallback sinh lưới vuông demo.
export type LatLng = [number, number];

export type Pt = { lat: number; lng: number };

// Dien tich da giac tren mat cau Trai Dat (m²) — cong thuc trac dia nhu Leaflet.Draw
export function geodesicArea(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  const R = 6378137; // ban kinh Trai Dat (m)
  const d2r = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    area += (p2.lng - p1.lng) * d2r * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
  }
  return Math.abs((area * R * R) / 2);
}

// Parse field `boundary` (GeoJSON Polygon hoặc string JSON) -> mảng LatLng cho Leaflet.
// GeoJSON dùng thứ tự [lng, lat]; Leaflet dùng [lat, lng] nên cần đảo.
export function polygonFromGeoJSON(raw: unknown): LatLng[] | null {
  if (!raw) return null;
  let obj: any = raw;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  const ring = obj?.type === "Polygon" ? obj.coordinates?.[0] : null;
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const pts: LatLng[] = ring
    .filter((c: any) => Array.isArray(c) && c.length >= 2)
    .map((c: any) => [Number(c[1]), Number(c[0])] as LatLng)
    .filter(([la, ln]) => Number.isFinite(la) && Number.isFinite(ln));
  // Bỏ điểm đóng vòng trùng đầu (GeoJSON ring khép kín) để Leaflet vẽ đẹp
  if (pts.length > 1) {
    const [a0, a1] = pts[0], [b0, b1] = pts[pts.length - 1];
    if (a0 === b0 && a1 === b1) pts.pop();
  }
  return pts.length >= 3 ? pts : null;
}

function centerOf(poly: LatLng[]): LatLng {
  let lat = 0, lng = 0;
  poly.forEach(([la, ln]) => { lat += la; lng += ln; });
  return [lat / poly.length, lng / poly.length];
}

const GEO_ORIGIN = { lat: 11.96, lng: 108.436 }; // góc Tây-Bắc khu trại (demo quanh Đà Lạt)
const ZONE_DEG = 0.013; // cạnh vùng (~1.4km)

function rectPolygon(north: number, south: number, east: number, west: number): LatLng[] {
  return [
    [north, west],
    [north, east],
    [south, east],
    [south, west],
  ];
}

export type GeoEntry = { polygon: LatLng[]; center: LatLng };

export function computeGeo(zones: { id: string }[], plots: { id: string; zoneId: string }[]) {
  const zoneGeo: Record<string, GeoEntry> = {};
  const plotGeo: Record<string, GeoEntry> = {};

  const nZones = zones.length || 1;
  const zCols = Math.ceil(Math.sqrt(nZones));

  zones.forEach((z, zi) => {
    const col = zi % zCols;
    const row = Math.floor(zi / zCols);
    const north = GEO_ORIGIN.lat - row * ZONE_DEG;
    const south = north - ZONE_DEG;
    const west = GEO_ORIGIN.lng + col * ZONE_DEG;
    const east = west + ZONE_DEG;
    zoneGeo[z.id] = {
      polygon: rectPolygon(north, south, east, west),
      center: [(north + south) / 2, (east + west) / 2],
    };

    const zonePlots = plots.filter((p) => p.zoneId === z.id);
    const n = zonePlots.length || 1;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cellW = (east - west) / cols;
    const cellH = (north - south) / rows;
    zonePlots.forEach((p, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const pWest = west + c * cellW;
      const pEast = west + (c + 1) * cellW;
      const pNorth = north - r * cellH;
      const pSouth = north - (r + 1) * cellH;
      plotGeo[p.id] = {
        polygon: rectPolygon(pNorth, pSouth, pEast, pWest),
        center: [(pNorth + pSouth) / 2, (pEast + pWest) / 2],
      };
    });
  });

  const zRows = Math.ceil(nZones / zCols);
  const farmCenter: LatLng = [
    GEO_ORIGIN.lat - (zRows * ZONE_DEG) / 2,
    GEO_ORIGIN.lng + (zCols * ZONE_DEG) / 2,
  ];

  return { zoneGeo, plotGeo, farmCenter };
}

// Build hình học cho bản đồ nhiệt: ưu tiên polygon thật từ field `boundary`;
// vùng/lô nào chưa có ranh giới thì lấy lưới fallback (computeGeo) — để demo data cũ
// chưa vẽ ranh giới vẫn hiện được trên bản đồ.
export function buildGeo(
  zones: { id: string; boundary?: unknown }[],
  plots: { id: string; zoneId: string; boundary?: unknown }[],
) {
  const fallback = computeGeo(zones, plots);
  const zoneGeo: Record<string, GeoEntry> = {};
  const plotGeo: Record<string, GeoEntry> = {};

  zones.forEach((z) => {
    const poly = polygonFromGeoJSON(z.boundary);
    zoneGeo[z.id] = poly
      ? { polygon: poly, center: centerOf(poly) }
      : fallback.zoneGeo[z.id];
  });
  plots.forEach((p) => {
    const poly = polygonFromGeoJSON(p.boundary);
    plotGeo[p.id] = poly
      ? { polygon: poly, center: centerOf(poly) }
      : fallback.plotGeo[p.id];
  });

  // farmCenter = trung bình tâm các vùng có ranh giới (nếu có), nếu không thì fallback
  let lat = 0, lng = 0, n = 0;
  Object.values(zoneGeo).forEach((g) => { if (g) { lat += g.center[0]; lng += g.center[1]; n++; } });
  const farmCenter: LatLng = n > 0 ? [lat / n, lng / n] : fallback.farmCenter;

  return { zoneGeo, plotGeo, farmCenter };
}
