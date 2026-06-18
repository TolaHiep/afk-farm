// Nén/resize ảnh phía client thành data URL JPEG (canvas). Sàn chất lượng = HD.
export const ONLINE = { maxDim: 1920, quality: 0.85 };
export const OFFLINE = { maxDim: 1280, quality: 0.8 };
export const MAX_PHOTOS = 5;

// Kích thước sau resize: thu theo cạnh dài về maxDim, giữ tỉ lệ; không phóng to.
export function scaledSize(w: number, h: number, maxDim: number): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= maxDim) return { w, h };
  const k = maxDim / longest;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

// Số byte thực mã hoá trong data URL base64.
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

// Nén 1 file ảnh -> data URL JPEG. Tôn trọng EXIF orientation.
export async function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { w, h } = scaledSize(bitmap.width, bitmap.height, maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được canvas để nén ảnh");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
