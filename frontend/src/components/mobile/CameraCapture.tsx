import React from "react";
import { Camera, X } from "lucide-react";
import { drawWatermark, watermarkLines } from "../../lib/watermark";
import type { CapturedPhoto } from "../../lib/capture";

export function CameraCapture({
  plotName, onCapture, onClose, onUnavailable,
}: {
  plotName: string;
  onCapture: (p: CapturedPhoto) => void;
  onClose: () => void;
  onUnavailable: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const geoRef = React.useRef<{ lat: number | null; lng: number | null; accuracy: number | null }>({
    lat: null, lng: null, accuracy: null,
  });
  const [ready, setReady] = React.useState(false);
  const [shooting, setShooting] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) { onUnavailable(); return; }
    md.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => { if (alive) onUnavailable(); });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }; },
        () => { /* tu choi/that bai -> giu null */ },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
    }
    return () => {
      alive = false;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [onUnavailable]);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || shooting) return;
    setShooting(true);
    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được canvas");
      ctx.drawImage(video, 0, 0, w, h);
      const { lat, lng, accuracy } = geoRef.current;
      const capturedAt = new Date();
      drawWatermark(ctx, w, h, watermarkLines(capturedAt, lat, lng, plotName));
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob null"))), "image/jpeg", 0.92),
      );
      const file = new File([blob], `capture-${capturedAt.getTime()}.jpg`, { type: "image/jpeg" });
      onCapture({ file, lat, lng, accuracy, capturedAt: capturedAt.toISOString() });
    } finally {
      setShooting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm truncate">Chụp ảnh tại lô: {plotName}</span>
        <button onClick={onClose} aria-label="Đóng"><X className="w-6 h-6" /></button>
      </div>
      <div className="flex-1 relative">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {!ready && <p className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">Đang mở camera…</p>}
      </div>
      <div className="p-6 flex justify-center bg-black">
        <button
          onClick={shoot}
          disabled={!ready || shooting}
          aria-label="Chụp"
          className="w-16 h-16 rounded-full bg-white disabled:opacity-50 flex items-center justify-center"
        >
          <Camera className="w-7 h-7 text-black" />
        </button>
      </div>
    </div>
  );
}
