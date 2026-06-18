import { describe, it, expect } from "vitest";
import { scaledSize, dataUrlBytes } from "./image";
import { withinBudget } from "./offline";

describe("scaledSize", () => {
  it("khong phong to anh nho hon maxDim", () => {
    expect(scaledSize(800, 600, 1280)).toEqual({ w: 800, h: 600 });
  });
  it("thu nho theo canh dai, giu ti le (4:3 -> HD)", () => {
    expect(scaledSize(4032, 3024, 1280)).toEqual({ w: 1280, h: 960 });
  });
  it("anh doc cung thu theo canh dai", () => {
    expect(scaledSize(3024, 4032, 1280)).toEqual({ w: 960, h: 1280 });
  });
});

describe("dataUrlBytes", () => {
  it("tinh dung so byte tu phan base64", () => {
    // "AAAA" (4 ky tu base64, khong padding) = 3 byte
    expect(dataUrlBytes("data:image/jpeg;base64,AAAA")).toBe(3);
  });
  it("tru padding '='", () => {
    // "AA==" = 1 byte
    expect(dataUrlBytes("data:image/jpeg;base64,AA==")).toBe(1);
  });
});

describe("withinBudget", () => {
  it("true khi tong <= budget", () => {
    expect(withinBudget(1000, 500, 2000)).toBe(true);
  });
  it("false khi vuot budget", () => {
    expect(withinBudget(1800, 500, 2000)).toBe(false);
  });
});
