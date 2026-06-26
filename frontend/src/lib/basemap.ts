import L from "leaflet";

// ponytail: ảnh vệ tinh Esri + 1 lớp nhãn trong suốt (tên khu vực/địa danh) -> "vệ tinh + nhãn"
// = 2 lớp (nhẹ). Tên đường có ở lớp "Đường phố" (OSM). Đều miễn phí, KHÔNG cần API key.
const IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const PLACES = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

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
  L.tileLayer(PLACES, labelOptsFor(labelsPane)).addTo(map);
}

/** Như trên + nút chuyển lớp (Vệ tinh+nhãn / Vệ tinh / Đường phố). Mặc định = Vệ tinh+nhãn. */
export function addBasemapSwitcher(
  map: L.Map, labelsPane?: string, position: L.ControlPosition = "topright"
) {
  const labelOpts = labelOptsFor(labelsPane);
  const hybrid = L.layerGroup([
    L.tileLayer(IMAGERY, PERF),
    L.tileLayer(PLACES, labelOpts),
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

let _warmed = false;  // warm 1 lần / phiên trang

/** Tải trước (warm) tile khu nông trại vào cache trình duyệt -> chuyển vùng lấy từ cache, tức thì.
 *  AN TOÀN: tối đa `concurrency` request cùng lúc (không nghẽn pool -> không làm trắng map) +
 *  hoãn `delayMs` để tile đang xem tải trước. Chỉ khu nông trại + có TRẦN số ô (không tải hàng loạt). */
export function prefetchFarmTiles(
  bounds: L.LatLngBounds,
  opts: { minZoom?: number; maxZoom?: number; max?: number; concurrency?: number; delayMs?: number } = {},
) {
  if (_warmed) return;
  _warmed = true;
  const { minZoom = 15, maxZoom = 17, max = 250, concurrency = 3, delayMs = 2000 } = opts;
  const lng2x = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
  const lat2y = (lat: number, z: number) => {
    const r = (lat * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
  };
  // Gom danh sách URL (có trần số ô)
  const urls: string[] = [];
  let cells = 0;
  for (let z = minZoom; z <= maxZoom && cells < max; z++) {
    const x0 = lng2x(bounds.getWest(), z), x1 = lng2x(bounds.getEast(), z);
    const y0 = lat2y(bounds.getNorth(), z), y1 = lat2y(bounds.getSouth(), z);
    for (let x = x0; x <= x1 && cells < max; x++) {
      for (let y = y0; y <= y1 && cells < max; y++) {
        for (const u of [IMAGERY, PLACES]) {
          urls.push(u.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)));
        }
        cells++;
      }
    }
  }
  // Hàng đợi giới hạn đồng thời: không bao giờ vượt `concurrency` -> luôn chừa băng thông cho map
  let i = 0, inflight = 0;
  const pump = () => {
    while (inflight < concurrency && i < urls.length) {
      inflight++;
      const img = new Image();
      const next = () => { inflight--; pump(); };
      img.onload = next;
      img.onerror = next;
      img.src = urls[i++];
    }
  };
  setTimeout(pump, delayMs);
}
