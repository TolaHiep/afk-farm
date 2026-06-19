// Watermark đốt lên ảnh nghiệm thu: giờ + GPS + tên lô.
export function watermarkLines(capturedAt: Date, lat: number | null, lng: number | null, plotName: string): string[] {
  const t = capturedAt.toLocaleString("vi-VN");
  const gps = lat != null && lng != null ? `GPS ${lat.toFixed(6)}, ${lng.toFixed(6)}` : "GPS: thiếu";
  return [t, gps, plotName];
}

// Vẽ overlay (dải đen mờ ở đáy ảnh, chữ trắng) lên canvas đã có ảnh.
export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[]): void {
  const fontPx = Math.max(14, Math.round(h * 0.035));
  const pad = Math.round(fontPx * 0.5);
  const lineH = Math.round(fontPx * 1.3);
  const boxH = lineH * lines.length + pad;
  ctx.font = `bold ${fontPx}px sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, h - boxH, w, boxH);
  ctx.fillStyle = "#ffffff";
  lines.forEach((ln, i) => {
    ctx.fillText(ln, pad, h - boxH + pad + lineH * (i + 1) - Math.round(lineH * 0.3));
  });
}
