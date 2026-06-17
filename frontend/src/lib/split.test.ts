import { describe, it, expect } from "vitest";
import {
  equalWeights, plotCountByArea, areaRemainder, keepSmallWeights,
  splitLabels, defaultPrefix,
} from "./split";

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
