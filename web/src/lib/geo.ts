// Sinh hình học lưới cho bản đồ nhiệt từ danh sách vùng/lô của API (không cần toạ độ thật).
// Vùng xếp thành lưới vuông theo thứ tự; lô lấp kín bên trong vùng theo lưới con.
export type LatLng = [number, number];

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
