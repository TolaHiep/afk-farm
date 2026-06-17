import type { Pt } from "./geo";

// Số lô khi chia theo diện tích: làm tròn xuống, tối thiểu 1
export function plotCountByArea(zoneArea: number, target: number): number {
  if (target <= 0) return 1;
  return Math.max(1, Math.floor(zoneArea / target + 1e-9));
}

// Phần diện tích dư sau khi cắt N lô đúng bằng target
export function areaRemainder(zoneArea: number, target: number): number {
  const n = plotCountByArea(zoneArea, target);
  return Math.max(0, zoneArea - n * target);
}

// Trọng số bằng nhau cho n lô (tối thiểu 1)
export function equalWeights(n: number): number[] {
  return Array(Math.max(1, Math.floor(n))).fill(1);
}

// Trọng số "giữ lô nhỏ": N lô đúng target + 1 lô phần dư (nếu dư > 1 m²)
export function keepSmallWeights(zoneArea: number, target: number): number[] {
  const n = plotCountByArea(zoneArea, target);
  const rem = zoneArea - n * target;
  const w = Array(n).fill(target);
  if (rem > 1) w.push(rem);
  return w;
}

// Tên lô: prefix + STT liên tiếp
export function splitLabels(prefix: string, start: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${start + i}`);
}

// Tiền tố mặc định suy từ tên vùng: "Vùng A" -> "A"
export function defaultPrefix(zoneName: string): string {
  const stripped = (zoneName || "").replace(/^\s*vùng\s+/i, "").replace(/\s+/g, " ").trim();
  return stripped || (zoneName || "").trim();
}

type XY = { x: number; y: number };

function planArea(poly: XY[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

// Cắt polygon bằng nửa mặt phẳng (Sutherland–Hodgman cho 1 đường thẳng đứng/ngang)
function clip(poly: XY[], axis: "x" | "y", cut: number, keepLower: boolean): XY[] {
  const coord = (p: XY) => (axis === "x" ? p.x : p.y);
  const inside = (p: XY) => (keepLower ? coord(p) <= cut : coord(p) >= cut);
  const out: XY[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ain = inside(a), bin = inside(b);
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (cut - coord(a)) / (coord(b) - coord(a));
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return out;
}

function recurse(poly: XY[], weights: number[]): XY[][] {
  if (weights.length <= 1) return [poly];
  const half = Math.ceil(weights.length / 2);
  const wFirst = weights.slice(0, half);
  const wRest = weights.slice(half);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const frac = sum(wFirst) / sum(weights);

  // chọn cạnh dài hơn của bounding box để cắt -> lô gọn hơn
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of poly) {
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
    if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
  }
  const axis: "x" | "y" = (maxx - minx) >= (maxy - miny) ? "x" : "y";
  const lo = axis === "x" ? minx : miny;
  const hi = axis === "x" ? maxx : maxy;

  const target = planArea(poly) * frac;
  let a = lo, c = hi;
  for (let i = 0; i < 40; i++) {
    const mid = (a + c) / 2;
    if (planArea(clip(poly, axis, mid, true)) < target) a = mid;
    else c = mid;
  }
  const cut = (a + c) / 2;
  const left = clip(poly, axis, cut, true);
  const right = clip(poly, axis, cut, false);
  return [...recurse(left, wFirst), ...recurse(right, wRest)];
}

// Cắt polygon thành weights.length mảnh, diện tích tỉ lệ với weights.
export function splitPolygonByWeights(polygon: Pt[], weights: number[]): Pt[][] {
  if (weights.length <= 1) return [polygon];
  const lat0 = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const k = Math.cos((lat0 * Math.PI) / 180) || 1; // chiếu equirectangular giữ tỉ lệ diện tích
  const proj: XY[] = polygon.map((p) => ({ x: p.lng * k, y: p.lat }));
  const parts = recurse(proj, weights);
  return parts.map((part) => part.map((q) => ({ lat: q.y, lng: q.x / k })));
}

export type { Pt };
