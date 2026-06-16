import React from "react";
import { Link } from "react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Filter, Calendar, MapPin, Sprout, User, AlertTriangle, CheckCircle2, Clock, CircleDashed, Layers } from "lucide-react";
import { Button } from "../ui/button";
import { getHeatmap, getAnomalies, getCalendar } from "../../lib/queries";
import { computeGeo, type GeoEntry, type LatLng } from "../../lib/geo";

type StatusKey = "good" | "warning" | "danger" | "pending" | "done" | "inactive";

const STATUS: Record<StatusKey, { label: string; tile: string; text: string; dot: string; bar: string; hex: string }> = {
  good:     { label: "Bình thường",   tile: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500",   bar: "bg-green-500",   hex: "#16a34a" },
  done:     { label: "Đã hoàn thành", tile: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-600", bar: "bg-emerald-600", hex: "#059669" },
  warning:  { label: "Cần chú ý",     tile: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   bar: "bg-amber-500",   hex: "#f59e0b" },
  danger:   { label: "Có vấn đề",     tile: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     bar: "bg-red-500",     hex: "#dc2626" },
  pending:  { label: "Chưa xử lý",    tile: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400",    bar: "bg-gray-400",    hex: "#9ca3af" },
  inactive: { label: "Nghỉ",          tile: "bg-gray-50",    text: "text-gray-500",    dot: "bg-gray-300",    bar: "bg-gray-300",    hex: "#9ca3af" },
};
const st = (s: string) => STATUS[(s as StatusKey)] || STATUS.pending;

// Trộn nhiều màu hex theo trọng số (tỉ lệ) — dùng cho lô xen canh nhiều cây khác màu trạng thái
function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixColors(items: { hex: string; weight: number }[]): string {
  const total = items.reduce((s, i) => s + (i.weight > 0 ? i.weight : 0), 0) || items.length || 1;
  let r = 0, g = 0, b = 0;
  items.forEach(({ hex, weight }) => {
    const w = (weight > 0 ? weight : 0) / total;
    const [R, G, B] = hexToRgb(hex);
    r += R * w; g += G * w; b += B * w;
  });
  const f = (x: number) => Math.round(x).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

// ===== Bản đồ vệ tinh kiểu "nhiệt thời tiết": lớp màu nền blur tạo gradient mượt =====
function SatelliteMap({
  filterZone, filterCrop, selectedPlot, selectedZone, onSelectZone, onSelectPlot,
  plots, zones, zoneGeo, plotGeo, farmCenter,
}: {
  filterZone: string; filterCrop: string; selectedPlot: string | null; selectedZone: string | null;
  onSelectZone: (id: string) => void; onSelectPlot: (id: string) => void;
  plots: any[]; zones: any[];
  zoneGeo: Record<string, GeoEntry>; plotGeo: Record<string, GeoEntry>; farmCenter: LatLng;
}) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const heatRef = React.useRef<L.LayerGroup | null>(null);   // lớp màu nền (blur) — KHÔNG nhận click
  const zoneRef = React.useRef<L.LayerGroup | null>(null);   // viền vùng + nhãn + bắt click
  const plotRef = React.useRef<L.LayerGroup | null>(null);   // viền lô của vùng đang chọn

  // Màu tô của lô trên bản đồ nhiệt:
  // - Khi lọc 1 cây: dùng đúng màu trạng thái cây đó.
  // - Khi xem tất cả: TRỘN màu trạng thái của các cây theo tỉ lệ số việc (total) của từng cây.
  const plotHeatColor = (p: any) => {
    if (filterCrop !== "all") return st(p.crops.find((c: any) => c.crop === filterCrop)?.status ?? p.status).hex;
    if (!p.crops.length) return st(p.status).hex;
    return mixColors(p.crops.map((c: any) => ({ hex: st(c.status).hex, weight: c.total || 1 })));
  };

  // Khởi tạo bản đồ 1 lần
  React.useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center: farmCenter, zoom: 15, attributionControl: false, zoomControl: true });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
    // Pane riêng cho lớp màu nhiệt, làm mờ để các ô màu hòa vào nhau (gradient như bản đồ thời tiết)
    const pane = map.createPane("heat");
    pane.style.zIndex = "250";
    pane.style.filter = "blur(18px)";
    pane.style.opacity = "0.8";
    pane.style.pointerEvents = "none";
    heatRef.current = L.layerGroup().addTo(map);
    zoneRef.current = L.layerGroup().addTo(map);
    plotRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Canh để thấy toàn bộ 4 vùng
    const allPts = zones.flatMap((z) => zoneGeo[z.id]?.polygon || []);
    if (allPts.length) map.fitBounds(L.latLngBounds(allPts as L.LatLngExpression[]), { padding: [24, 24] });
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vẽ lại khi bộ lọc / lựa chọn đổi
  React.useEffect(() => {
    const map = mapRef.current, heat = heatRef.current, zoneLayer = zoneRef.current, plotLayer = plotRef.current;
    if (!map || !heat || !zoneLayer || !plotLayer) return;
    heat.clearLayers();
    zoneLayer.clearLayers();
    plotLayer.clearLayers();

    const shownZones = zones.filter((z) => filterZone === "all" || z.id === filterZone);

    shownZones.forEach((z) => {
      const zg = zoneGeo[z.id];
      if (!zg) return;

      // 1) Lớp màu nhiệt: tô từng lô theo trạng thái cây → blur thành gradient
      plots.filter((p) => p.zoneId === z.id).forEach((p) => {
        const pg = plotGeo[p.id];
        if (!pg) return;
        L.polygon(pg.polygon, {
          pane: "heat", stroke: false, fillColor: plotHeatColor(p), fillOpacity: 0.9, interactive: false,
        }).addTo(heat);
      });

      // 2) Viền vùng mảnh + nhãn tên + bắt click
      const sel = selectedZone === z.id;
      const zonePoly = L.polygon(zg.polygon, {
        color: "#ffffff", weight: sel ? 2.5 : 1, opacity: sel ? 0.95 : 0.6, fill: true, fillOpacity: 0,
      }).addTo(zoneLayer);
      zonePoly.bindTooltip(z.name, { permanent: true, direction: "center", className: "akf-zone-label" });
      zonePoly.on("click", () => { onSelectZone(z.id); map.flyToBounds(L.latLngBounds(zg.polygon), { maxZoom: 17, duration: 0.6, padding: [10, 10] }); });
    });

    // 3) Chỉ hiện viền + tên LÔ của vùng đang chọn (hoặc đang lọc)
    const activeZone = selectedZone ?? (filterZone !== "all" ? filterZone : null);
    if (activeZone) {
      plots.filter((p) => p.zoneId === activeZone).forEach((p) => {
        const pg = plotGeo[p.id];
        if (!pg) return;
        const selP = selectedPlot === p.id;
        const pp = L.polygon(pg.polygon, {
          color: "#ffffff", weight: selP ? 3 : 1.2, opacity: 0.9, fill: true, fillOpacity: 0,
        }).addTo(plotLayer);
        pp.bindTooltip(p.name, { permanent: true, direction: "center", className: "akf-plot-label" });
        pp.on("click", () => onSelectPlot(p.id));
      });
    }

    // Canh khung nhìn theo bộ lọc vùng (không tự fit khi chỉ chọn để tránh giật)
    if (filterZone !== "all" && zoneGeo[filterZone]) {
      map.fitBounds(L.latLngBounds(zoneGeo[filterZone].polygon), { padding: [10, 10], maxZoom: 17 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterZone, filterCrop, selectedPlot, selectedZone]);

  return <div ref={elRef} className="w-full h-[clamp(360px,58vh,560px)] rounded-lg overflow-hidden border border-gray-200 relative z-0" />;
}

export function HeatMap() {
  const [selectedPlot, setSelectedPlot] = React.useState<string | null>(null);
  const [selectedZone, setSelectedZone] = React.useState<string | null>(null);
  const [filterDate, setFilterDate] = React.useState("2026-06-14");
  const [filterZone, setFilterZone] = React.useState("all");
  const [filterCrop, setFilterCrop] = React.useState("all");

  const [zones, setZones] = React.useState<any[]>([]);
  const [plots, setPlots] = React.useState<any[]>([]);
  const [anomalies, setAnomalies] = React.useState<any[]>([]);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [geo, setGeo] = React.useState<ReturnType<typeof computeGeo>>({ zoneGeo: {}, plotGeo: {}, farmCenter: [0, 0] });

  const zoneName = (zoneId: string) => zones.find((z) => z.id === zoneId)?.name ?? zoneId;

  React.useEffect(() => {
    let alive = true;
    Promise.all([getHeatmap(), getAnomalies()])
      .then(([hm, an]) => {
        if (!alive) return;
        const z = hm?.zones ?? [];
        const p = hm?.plots ?? [];
        setZones(z);
        setPlots(p);
        setAnomalies(an ?? []);
        setGeo(computeGeo(z, p));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    let alive = true;
    getCalendar(filterDate, 1).then((t) => { if (alive) setTasks(t ?? []); }).catch(() => { if (alive) setTasks([]); });
    return () => { alive = false; };
  }, [filterDate]);

  const selectedPlotData = (plots ?? []).find((p) => p.id === selectedPlot);
  const selectedZoneData = (zones ?? []).find((z) => z.id === selectedZone);

  const visiblePlots = (plots ?? []).filter((p) => {
    if (filterZone !== "all" && p.zoneId !== filterZone) return false;
    if (filterCrop !== "all" && !p.crop.includes(filterCrop)) return false;
    return true;
  });
  const cropsOf = (p: any) => (filterCrop === "all" ? p.crops : p.crops.filter((c: any) => c.crop === filterCrop));
  const allShownCrops = visiblePlots.flatMap(cropsOf);
  const summary = {
    good: allShownCrops.filter((c: any) => c.status === "good" || c.status === "done").length,
    warning: allShownCrops.filter((c: any) => c.status === "warning" || c.status === "pending").length,
    danger: allShownCrops.filter((c: any) => c.status === "danger").length,
  };

  const onSelectPlot = (id: string) => { setSelectedPlot(id); setSelectedZone((plots ?? []).find((p) => p.id === id)?.zoneId ?? null); };
  const onSelectZone = (id: string) => { setSelectedZone(id); setSelectedPlot(null); };

  // ----- dữ liệu cho panel chi tiết lô -----
  const plotTasks = (tasks ?? []).filter((t) => t.plotId === selectedPlot && t.date === filterDate && (filterCrop === "all" || t.crop === filterCrop));
  const TASK_STATUS: Record<string, { title: string; text: string; Icon: typeof CheckCircle2 }> = {
    completed: { title: "Đã hoàn thành", text: "text-green-700", Icon: CheckCircle2 },
    "in-progress": { title: "Đang làm", text: "text-blue-700", Icon: Clock },
    pending: { title: "Chưa làm", text: "text-gray-600", Icon: CircleDashed },
    overdue: { title: "Quá hạn", text: "text-red-700", Icon: AlertTriangle },
  };
  const TASK_ORDER = ["completed", "in-progress", "pending", "overdue"];
  const detailCrops: any[] = selectedPlotData ? (filterCrop === "all" ? selectedPlotData.crops : selectedPlotData.crops.filter((c: any) => c.crop === filterCrop)) : [];
  const tasksByCrop = detailCrops.map((c: any) => ({
    crop: c,
    items: plotTasks.filter((t) => t.crop === c.crop).sort((a, b) => TASK_ORDER.indexOf(a.status) - TASK_ORDER.indexOf(b.status)),
  }));
  const plotAnomalies = (anomalies ?? []).filter((a) => a.plotId === selectedPlot && (filterCrop === "all" || a.crop === filterCrop));

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải bản đồ…</div>;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select value={filterZone} onChange={(e) => { setFilterZone(e.target.value); setSelectedZone(e.target.value === "all" ? null : e.target.value); setSelectedPlot(null); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Tất cả vùng</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            <select value={filterCrop} onChange={(e) => setFilterCrop(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Tất cả cây</option>
              <option value="Gấc">Gấc</option>
              <option value="Sâm">Sâm</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <SummaryChip color="bg-green-500" label="Bình thường" value={summary.good} />
            <SummaryChip color="bg-amber-500" label="Cần chú ý" value={summary.warning} />
            <SummaryChip color="bg-red-500" label="Có vấn đề" value={summary.danger} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bản đồ nhiệt vùng trồng (ảnh vệ tinh)</h3>
              <p className="text-xs text-gray-500 mt-0.5">Bấm vào vùng để xem thông tin · phóng to để hiện các lô bên trong</p>
            </div>
            <div className="flex items-center gap-4">
              {(["good", "warning", "danger"] as StatusKey[]).map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${STATUS[k].dot}`} />
                  <span className="text-xs text-gray-500">{STATUS[k].label}</span>
                </div>
              ))}
            </div>
          </div>
          <SatelliteMap
            filterZone={filterZone} filterCrop={filterCrop} selectedPlot={selectedPlot} selectedZone={selectedZone}
            onSelectZone={onSelectZone} onSelectPlot={onSelectPlot}
            plots={plots} zones={zones} zoneGeo={geo.zoneGeo} plotGeo={geo.plotGeo} farmCenter={geo.farmCenter}
          />
        </div>

        {/* Details panel */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          {selectedPlotData ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedPlotData.name}</h3>
                  <p className="text-sm text-gray-500">{zoneName(selectedPlotData.zoneId)} · Xen canh {selectedPlotData.crop}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st(selectedPlotData.status).tile} ${st(selectedPlotData.status).text}`}>
                  {st(selectedPlotData.status).label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InfoBox label="Tổ trưởng" value={selectedPlotData.teamLeader} />
                <InfoBox label="Diện tích" value={`${selectedPlotData.area.toLocaleString()} m²`} />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">Tiến độ theo cây</h4>
                <div className="space-y-3">
                  {detailCrops.map((c) => {
                    const cs = st(c.status);
                    const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
                    return (
                      <div key={c.crop} className="rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><Sprout className={`w-4 h-4 ${cs.text}`} /> {c.crop}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cs.tile} ${cs.text}`}>{cs.label}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1"><span>Tiến độ công việc</span><span className="font-medium">{c.done}/{c.total} ({pct}%)</span></div>
                        <div className="h-2 w-full rounded-full bg-white overflow-hidden"><div className={`h-full rounded-full ${cs.bar}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">Công việc ngày {filterDate}</h4>
                {plotTasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasksByCrop.map(({ crop, items }) => {
                      const cs = st(crop.status);
                      return (
                        <div key={crop.crop}>
                          <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-gray-800"><span className={`w-2 h-2 rounded-full ${cs.dot}`} />{crop.crop} <span className="text-xs font-normal text-gray-400">· {items.length} việc</span></div>
                          {items.length > 0 ? (
                            <ul className="ml-2 space-y-1.5">
                              {items.map((it) => {
                                const ts = TASK_STATUS[it.status] ?? TASK_STATUS.pending;
                                return (
                                  <li key={it.id} className="flex items-center gap-2 text-sm text-gray-700"><ts.Icon className={`w-4 h-4 shrink-0 ${ts.text}`} /><span className="flex-1">{it.title}</span><span className={`text-[11px] font-medium ${ts.text}`}>{ts.title}</span></li>
                                );
                              })}
                            </ul>
                          ) : <p className="ml-2 text-xs text-gray-400">Không có việc</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-gray-500">Không có công việc</p>}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">Bất thường / phát sinh ({plotAnomalies.length})</h4>
                {plotAnomalies.length > 0 ? (
                  <ul className="space-y-2">
                    {plotAnomalies.map((a) => (
                      <li key={a.id} className={`p-2.5 rounded-lg text-sm ${a.status === "resolved" ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"}`}>
                        <div className="font-medium">{a.type}</div><div className="text-xs opacity-80">{a.description}</div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Không có bất thường</p>}
              </div>

              <Link to="/admin/calendar"><Button variant="primary" className="w-full">Xem lịch công việc</Button></Link>
            </div>
          ) : selectedZoneData ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Layers className="w-5 h-5 text-green-600" /> {selectedZoneData.name}</h3>
                  <p className="text-sm text-gray-500">{(selectedZoneData.area / 10000).toFixed(1)} ha · {plots.filter((p) => p.zoneId === selectedZoneData.id).length} lô</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st(selectedZoneData.status).tile} ${st(selectedZoneData.status).text}`}>{st(selectedZoneData.status).label}</span>
              </div>
              <p className="text-xs text-gray-500">Phóng to bản đồ hoặc chọn một lô bên dưới để xem chi tiết.</p>
              <div className="space-y-2">
                {plots.filter((p) => p.zoneId === selectedZoneData.id).map((p) => (
                  <button key={p.id} onClick={() => onSelectPlot(p.id)} className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${st(p.status).dot}`} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Xen canh {p.crop} · {p.teamLeader} · {p.done}/{p.total} việc</div>
                  </button>
                ))}
                {plots.filter((p) => p.zoneId === selectedZoneData.id).length === 0 && <p className="text-sm text-gray-400">Chưa có lô trong vùng này</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] text-gray-400">
              <div className="text-center"><MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-sm">Bấm vào vùng hoặc lô trên bản đồ để xem chi tiết</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
