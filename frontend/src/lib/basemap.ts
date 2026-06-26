import L from "leaflet";

// ponytail: ảnh vệ tinh Esri + 2 lớp nhãn trong suốt (địa danh + đường) -> hybrid kiểu
// "Google Satellite + nhãn". Đều miễn phí, KHÔNG cần API key.
const IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const PLACES = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const ROADS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";

const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// Tinh chỉnh hiệu năng: giữ đệm tile rộng (đỡ tải lại khi pan qua vùng kế), và KHÔNG tải
// tile mới giữa lúc đang zoom-bay (chỉ tải 1 lần khi dừng) -> kéo/chuyển vùng mượt hơn.
const PERF: L.TileLayerOptions = { maxZoom: 19, keepBuffer: 4, updateWhenZooming: false };
const labelOptsFor = (labelsPane?: string): L.TileLayerOptions =>
  labelsPane ? { ...PERF, pane: labelsPane } : PERF;

/** Thêm nền vệ tinh + nhãn (tên khu vực, tên đường) vào map.
 *  labelsPane: tên pane riêng cho nhãn (dùng khi có lớp phủ khác cần nằm dưới nhãn, vd bản đồ nhiệt). */
export function addSatelliteHybrid(map: L.Map, labelsPane?: string) {
  L.tileLayer(IMAGERY, PERF).addTo(map);
  const opts = labelOptsFor(labelsPane);
  L.tileLayer(PLACES, opts).addTo(map);
  L.tileLayer(ROADS, opts).addTo(map);
}

/** Như trên + nút chuyển lớp (Vệ tinh+nhãn / Vệ tinh / Đường phố). Mặc định = Vệ tinh+nhãn. */
export function addBasemapSwitcher(
  map: L.Map, labelsPane?: string, position: L.ControlPosition = "topright"
) {
  const labelOpts = labelOptsFor(labelsPane);
  const hybrid = L.layerGroup([
    L.tileLayer(IMAGERY, PERF),
    L.tileLayer(PLACES, labelOpts),
    L.tileLayer(ROADS, labelOpts),
  ]);
  const satellite = L.layerGroup([L.tileLayer(IMAGERY, PERF)]);
  const street = L.tileLayer(OSM, PERF);
  hybrid.addTo(map);
  L.control.layers(
    { "Vệ tinh + nhãn": hybrid, "Vệ tinh": satellite, "Đường phố": street },
    {},
    { position, collapsed: true },
  ).addTo(map);
}

/** Tải trước (warm) tile của riêng vùng bao quanh nông trại vào cache trình duyệt -> pan/zoom
 *  giữa các vùng gần như tức thì. CHỈ khu nông trại + có TRẦN số tile (mặc định 800) để tránh
 *  burst nặng và tránh vi phạm ToS tile (không tải hàng loạt cả nước). Chạy nền, không chặn UI. */
export function prefetchTiles(
  bounds: L.LatLngBounds,
  opts: { minZoom: number; maxZoom: number; max?: number },
) {
  const max = opts.max ?? 800;
  const lng2x = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
  const lat2y = (lat: number, z: number) => {
    const r = (lat * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
  };
  let count = 0;
  for (let z = opts.minZoom; z <= opts.maxZoom && count < max; z++) {
    const x0 = lng2x(bounds.getWest(), z), x1 = lng2x(bounds.getEast(), z);
    const y0 = lat2y(bounds.getNorth(), z), y1 = lat2y(bounds.getSouth(), z);
    for (let x = x0; x <= x1 && count < max; x++) {
      for (let y = y0; y <= y1 && count < max; y++) {
        for (const u of [IMAGERY, PLACES, ROADS]) {
          new Image().src = u.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
        }
        count++;
      }
    }
  }
  return count;  // số ô đã warm (mỗi ô = 3 lớp hybrid)
}
