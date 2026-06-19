import { describe, it, expect } from "vitest";
import { watermarkLines } from "./watermark";

describe("watermarkLines", () => {
  it("co GPS -> 3 dong, dong GPS + ten lo dung", () => {
    const lines = watermarkLines(new Date("2026-06-19T08:00:00"), 11.94, 108.458, "Lô A1");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("GPS 11.940000, 108.458000");
    expect(lines[2]).toBe("Lô A1");
  });
  it("thieu GPS -> dong GPS bao thieu", () => {
    const lines = watermarkLines(new Date("2026-06-19T08:00:00"), null, null, "Lô A1");
    expect(lines[1]).toBe("GPS: thiếu");
  });
});
