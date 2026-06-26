import L from "leaflet";

// ponytail: ảnh vệ tinh Esri + 2 lớp nhãn trong suốt (địa danh + đường) -> hybrid kiểu
// "Google Satellite + nhãn". Đều miễn phí, KHÔNG cần API key.
const IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const PLACES = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const ROADS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";

const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Thêm nền vệ tinh + nhãn (tên khu vực, tên đường) vào map.
 *  labelsPane: tên pane riêng cho nhãn (dùng khi có lớp phủ khác cần nằm dưới nhãn, vd bản đồ nhiệt). */
export function addSatelliteHybrid(map: L.Map, labelsPane?: string) {
  L.tileLayer(IMAGERY, { maxZoom: 19 }).addTo(map);
  const opts: L.TileLayerOptions = labelsPane ? { maxZoom: 19, pane: labelsPane } : { maxZoom: 19 };
  L.tileLayer(PLACES, opts).addTo(map);
  L.tileLayer(ROADS, opts).addTo(map);
}

/** Như trên + nút chuyển lớp (Vệ tinh+nhãn / Vệ tinh / Đường phố). Mặc định = Vệ tinh+nhãn. */
export function addBasemapSwitcher(
  map: L.Map, labelsPane?: string, position: L.ControlPosition = "topright"
) {
  const labelOpts: L.TileLayerOptions = labelsPane ? { maxZoom: 19, pane: labelsPane } : { maxZoom: 19 };
  const hybrid = L.layerGroup([
    L.tileLayer(IMAGERY, { maxZoom: 19 }),
    L.tileLayer(PLACES, labelOpts),
    L.tileLayer(ROADS, labelOpts),
  ]);
  const satellite = L.layerGroup([L.tileLayer(IMAGERY, { maxZoom: 19 })]);
  const street = L.tileLayer(OSM, { maxZoom: 19 });
  hybrid.addTo(map);
  L.control.layers(
    { "Vệ tinh + nhãn": hybrid, "Vệ tinh": satellite, "Đường phố": street },
    {},
    { position, collapsed: true },
  ).addTo(map);
}
