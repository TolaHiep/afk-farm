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

// (splitPolygonByWeights được thêm ở Task 3)
export type { Pt };
