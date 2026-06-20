// Type + hằng số dùng chung. Dữ liệu thực thể (vùng/lô/việc/thông báo) lấy từ API backend
// (qua lib/queries.ts) — không còn mock array nào ở đây.

// MÔ HÌNH XEN CANH: mỗi lô trồng 2 tầng cây cùng lúc — Gấc leo giàn (tầng trên) + Sâm dưới tán (tầng dưới).
// crops[] theo dõi RIÊNG từng cây: tiến độ việc (done/total) và trạng thái.
export interface CropOnPlot { crop: string; done: number; total: number; status: string }

// Danh sách loại yêu cầu hỗ trợ trong form mobile (`MobileSupport`).
export const supportTypes = ["Vật tư", "Nhân lực", "Kỹ thuật", "Thiết bị", "Khác"];
