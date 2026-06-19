// Kiểu dữ liệu + hàm thuần cho luồng ảnh nghiệm thu (chống gian lận).
// Tách khỏi component để test được dưới vitest môi trường node.

export type CapturedPhoto = {
  file: File;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  capturedAt: string; // ISO
};

export type PhotoMeta = {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  capturedAt: string;
  inApp: boolean;
};

export type GpsStatus = "ok" | "far" | "missing";

export type TaskPhoto = {
  url: string;
  lat: number | null;
  lng: number | null;
  gpsAccuracy: number | null;
  capturedAt: string | null;
  gpsStatus: GpsStatus;
  distanceM: number | null;
  inApp: boolean;
};

export type PhotoFlag = { label: string; tone: "ok" | "warn" | "bad" };

// Ảnh chụp in-app -> metadata gửi backend (luôn inApp=true).
export function toPhotoMeta(c: CapturedPhoto): PhotoMeta {
  return { lat: c.lat, lng: c.lng, accuracy: c.accuracy, capturedAt: c.capturedAt, inApp: true };
}

// Nhãn + tông màu cho cờ GPS (admin hiển thị).
export function photoFlag(p: TaskPhoto): PhotoFlag {
  if (p.gpsStatus === "far") return { label: `Ngoài lô (~${Math.round(p.distanceM ?? 0)}m)`, tone: "bad" };
  if (p.gpsStatus === "missing") return { label: "Thiếu GPS", tone: "warn" };
  return { label: "Trong lô", tone: "ok" };
}
