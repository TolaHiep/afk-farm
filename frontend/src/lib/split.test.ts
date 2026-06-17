import { describe, it, expect } from "vitest";
import {
  equalWeights, plotCountByArea, areaRemainder, keepSmallWeights,
  splitLabels, defaultPrefix,
} from "./split";
import { splitPolygonByWeights } from "./split";
import { geodesicArea, type Pt } from "./geo";

describe("helper trọng số & tên", () => {
  it("equalWeights trả n số 1", () => {
    expect(equalWeights(3)).toEqual([1, 1, 1]);
    expect(equalWeights(0)).toEqual([1]); // tối thiểu 1 lô
  });
  it("plotCountByArea làm tròn xuống, tối thiểu 1", () => {
    expect(plotCountByArea(6500, 1000)).toBe(6);
    expect(plotCountByArea(6000, 1000)).toBe(6);
    expect(plotCountByArea(500, 1000)).toBe(1);
  });
  it("areaRemainder = phần dư sau N lô đủ", () => {
    expect(areaRemainder(6500, 1000)).toBe(500);
    expect(areaRemainder(6000, 1000)).toBe(0);
  });
  it("keepSmallWeights nối phần dư khi có dư", () => {
    expect(keepSmallWeights(6500, 1000)).toEqual([1000, 1000, 1000, 1000, 1000, 1000, 500]);
  });
  it("keepSmallWeights không nối khi chia hết", () => {
    expect(keepSmallWeights(6000, 1000)).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
  });
  it("splitLabels dựng tên theo STT", () => {
    expect(splitLabels("A", 1, 3)).toEqual(["A1", "A2", "A3"]);
    expect(splitLabels("A", 5, 2)).toEqual(["A5", "A6"]);
  });
  it("defaultPrefix bỏ tiền tố 'Vùng'", () => {
    expect(defaultPrefix("Vùng A")).toBe("A");
    expect(defaultPrefix("vùng  B")).toBe("B");
    expect(defaultPrefix("C")).toBe("C");
  });
});

const SQUARE: Pt[] = [
  { lat: 0, lng: 0 },
  { lat: 0.02, lng: 0 },
  { lat: 0.02, lng: 0.02 },
  { lat: 0, lng: 0.02 },
];

const areasOf = (parts: Pt[][]) => parts.map((p) => geodesicArea(p));

describe("splitPolygonByWeights", () => {
  it("chia đúng số mảnh, mỗi mảnh >= 3 điểm", () => {
    const parts = splitPolygonByWeights(SQUARE, [1, 1, 1, 1]);
    expect(parts.length).toBe(4);
    parts.forEach((p) => expect(p.length).toBeGreaterThanOrEqual(3));
  });
  it("bảo toàn tổng diện tích", () => {
    const total = geodesicArea(SQUARE);
    const parts = splitPolygonByWeights(SQUARE, [1, 1, 1, 1, 1, 1]);
    const sum = areasOf(parts).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - total) / total).toBeLessThan(0.01);
  });
  it("trọng số bằng nhau -> diện tích bằng nhau", () => {
    const a = areasOf(splitPolygonByWeights(SQUARE, [1, 1, 1, 1]));
    const min = Math.min(...a), max = Math.max(...a);
    expect((max - min) / max).toBeLessThan(0.02);
  });
  it("giữ đúng tỉ lệ trọng số 3:1", () => {
    const a = areasOf(splitPolygonByWeights(SQUARE, [3, 1])).sort((x, y) => x - y);
    expect(a[1] / a[0]).toBeGreaterThan(2.7);
    expect(a[1] / a[0]).toBeLessThan(3.3);
  });
  it("weights 1 phần tử trả nguyên polygon", () => {
    const parts = splitPolygonByWeights(SQUARE, [1]);
    expect(parts.length).toBe(1);
    expect(parts[0].length).toBeGreaterThanOrEqual(3);
  });
});
