import { describe, it, expect } from "vitest";
import { geodesicArea, type Pt } from "./geo";

// O vuong ~0.001° canh, gan xich dao: canh ~111.32m -> dien tich ~12390 m²
const SMALL: Pt[] = [
  { lat: 0, lng: 0 },
  { lat: 0.001, lng: 0 },
  { lat: 0.001, lng: 0.001 },
  { lat: 0, lng: 0.001 },
];

describe("geodesicArea", () => {
  it("tra 0 khi it hon 3 diem", () => {
    expect(geodesicArea([{ lat: 0, lng: 0 }])).toBe(0);
  });
  it("tinh dien tich o vuong nho gan dung", () => {
    const a = geodesicArea(SMALL);
    expect(a).toBeGreaterThan(12000);
    expect(a).toBeLessThan(12800);
  });
});
