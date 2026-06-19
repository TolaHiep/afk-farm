import { describe, it, expect } from "vitest";
import { toPhotoMeta, photoFlag, type TaskPhoto } from "./capture";

describe("toPhotoMeta", () => {
  it("gan inApp=true, giu nguyen toa do", () => {
    const m = toPhotoMeta({ file: null as any, lat: 11.94, lng: 108.45, accuracy: 8, capturedAt: "2026-06-19T08:00:00Z" });
    expect(m).toEqual({ lat: 11.94, lng: 108.45, accuracy: 8, capturedAt: "2026-06-19T08:00:00Z", inApp: true });
  });
});

describe("photoFlag", () => {
  const base: TaskPhoto = { url: "/x", lat: null, lng: null, gpsAccuracy: null, capturedAt: null, gpsStatus: "ok", distanceM: null, inApp: true };
  it("far -> bad + khoang cach lam tron", () => {
    expect(photoFlag({ ...base, gpsStatus: "far", distanceM: 87.3 })).toEqual({ label: "Ngoài lô (~87m)", tone: "bad" });
  });
  it("missing -> warn", () => {
    expect(photoFlag({ ...base, gpsStatus: "missing" }).tone).toBe("warn");
  });
  it("ok -> ok", () => {
    expect(photoFlag({ ...base, gpsStatus: "ok" }).label).toBe("Trong lô");
  });
});
