import L from "leaflet";

// ponytail: dùng Leaflet map.locate() (Geolocation API trình duyệt) — không thêm thư viện.
// Hiện 1 chấm "vị trí của tôi" + vòng tròn sai số; gọi lại sẽ cập nhật chứ không chồng marker.
const ICON = L.divIcon({ className: "akf-me", iconSize: [16, 16] });

export function locateMe(
  map: L.Map,
  opts: { onError?: (msg: string) => void; fitWith?: [number, number][] } = {}
) {
  const m = map as any;
  if (!m._akfMeLayer) m._akfMeLayer = L.layerGroup().addTo(map);
  const layer: L.LayerGroup = m._akfMeLayer;

  const cleanup = () => {
    map.off("locationfound", onFound);
    map.off("locationerror", onErr);
  };
  const onFound = (e: L.LocationEvent) => {
    layer.clearLayers();
    L.circle(e.latlng, {
      radius: e.accuracy, color: "#2563eb", weight: 1,
      fillColor: "#3b82f6", fillOpacity: 0.15, interactive: false,
    }).addTo(layer);
    L.marker(e.latlng, { icon: ICON, interactive: false }).addTo(layer);
    // Canh khung nhìn để thấy cả vị trí của tôi lẫn vùng (nếu có), nếu không chỉ tới vị trí.
    if (opts.fitWith && opts.fitWith.length) {
      map.fitBounds(L.latLngBounds([[e.latlng.lat, e.latlng.lng], ...opts.fitWith]), { padding: [30, 30], maxZoom: 18 });
    } else {
      map.setView(e.latlng, Math.max(map.getZoom(), 16));
    }
    cleanup();
  };
  const onErr = (e: L.ErrorEvent) => {
    opts.onError?.(
      e.code === 1
        ? "Bạn chưa cho phép truy cập vị trí. Vui lòng bật quyền vị trí cho trình duyệt rồi thử lại."
        : "Không lấy được vị trí GPS. Vui lòng thử lại."
    );
    cleanup();
  };
  map.on("locationfound", onFound);
  map.on("locationerror", onErr);
  map.locate({ enableHighAccuracy: true, timeout: 10000 });
}
