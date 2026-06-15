// Mock data for farm management system

export const zones = [
  { id: "z1", name: "Vùng A", area: 50000, plots: 4, status: "warning" },
  { id: "z2", name: "Vùng B", area: 45000, plots: 4, status: "danger" },
  { id: "z3", name: "Vùng C", area: 60000, plots: 4, status: "warning" },
  { id: "z4", name: "Vùng D", area: 35000, plots: 4, status: "danger" },
];

// Trạng thái lô/cây: good | warning | danger | pending(chưa xử lý) | done(đã hoàn thành) | inactive(nghỉ)
// MÔ HÌNH XEN CANH: mỗi lô trồng 2 tầng cây cùng lúc — Gấc leo giàn (tầng trên) + Sâm dưới tán (tầng dưới).
// crops[] theo dõi RIÊNG từng cây: tiến độ việc (done/total) và trạng thái. Các trường tổng hợp
// (crop, done, total, status) được suy ra tự động để tương thích phần hiển thị gộp.
export interface CropOnPlot { crop: string; done: number; total: number; status: string }
const STATUS_ORDER: Record<string, number> = { danger: 4, warning: 3, pending: 2, good: 1, done: 1, inactive: 0 };

function buildPlot(
  base: { id: string; name: string; zoneId: string; area: number; teamLeader: string; teamLeaderId: string; coordinates: number[][] },
  crops: CropOnPlot[]
) {
  const done = crops.reduce((s, c) => s + c.done, 0);
  const total = crops.reduce((s, c) => s + c.total, 0);
  const status = crops.reduce((w, c) => (STATUS_ORDER[c.status] > (STATUS_ORDER[w] ?? 0) ? c.status : w), crops[0]?.status ?? "good");
  return { ...base, crops, crop: crops.map((c) => c.crop).join(" + "), done, total, status };
}

// Bộ cây xen canh theo trạng thái mục tiêu (Gấc giàn trên + Sâm dưới tán). Mỗi lần gọi tạo object mới.
function mkCrops(target: "good" | "warning" | "danger"): CropOnPlot[] {
  if (target === "good") return [
    { crop: "Gấc", done: 4, total: 4, status: "good" },
    { crop: "Sâm", done: 3, total: 3, status: "good" },
  ];
  if (target === "warning") return [
    { crop: "Gấc", done: 2, total: 5, status: "warning" },
    { crop: "Sâm", done: 3, total: 4, status: "good" },
  ];
  return [
    { crop: "Gấc", done: 1, total: 5, status: "danger" },
    { crop: "Sâm", done: 2, total: 4, status: "warning" },
  ];
}
const noCoord: number[][] = [];

// 4 vùng × 4 lô = 16 lô. Trạng thái bố trí để demo bản đồ nhiệt gradient.
export const plots = [
  // Vùng A (z1): chủ yếu xanh, 1 lô vàng
  buildPlot({ id: "p1", name: "Lô A1", zoneId: "z1", area: 12500, teamLeader: "Nguyễn Văn A", teamLeaderId: "tl1", coordinates: noCoord }, mkCrops("good")),
  buildPlot({ id: "p2", name: "Lô A2", zoneId: "z1", area: 12500, teamLeader: "Nguyễn Văn A", teamLeaderId: "tl1", coordinates: noCoord }, mkCrops("good")),
  buildPlot({ id: "p3", name: "Lô A3", zoneId: "z1", area: 12500, teamLeader: "Trần Thị B", teamLeaderId: "tl2", coordinates: noCoord }, mkCrops("warning")),
  buildPlot({ id: "p4", name: "Lô A4", zoneId: "z1", area: 12500, teamLeader: "Trần Thị B", teamLeaderId: "tl2", coordinates: noCoord }, mkCrops("good")),
  // Vùng B (z2): LẪN vàng + đỏ (demo gradient)
  buildPlot({ id: "p5", name: "Lô B1", zoneId: "z2", area: 11250, teamLeader: "Nguyễn Văn A", teamLeaderId: "tl1", coordinates: noCoord }, mkCrops("warning")),
  buildPlot({ id: "p6", name: "Lô B2", zoneId: "z2", area: 11250, teamLeader: "Lê Văn C", teamLeaderId: "tl3", coordinates: noCoord }, mkCrops("danger")),
  buildPlot({ id: "p7", name: "Lô B3", zoneId: "z2", area: 11250, teamLeader: "Lê Văn C", teamLeaderId: "tl3", coordinates: noCoord }, [
    { crop: "Gấc", done: 3, total: 3, status: "good" },   // xanh, trọng số 3
    { crop: "Sâm", done: 1, total: 5, status: "danger" },  // đỏ, trọng số 5 -> trộn xanh:đỏ = 3:5
  ]),
  buildPlot({ id: "p8", name: "Lô B4", zoneId: "z2", area: 11250, teamLeader: "Phạm Thị D", teamLeaderId: "tl4", coordinates: noCoord }, mkCrops("good")),
  // Vùng C (z3): chủ yếu xanh, 1 lô vàng
  buildPlot({ id: "p9", name: "Lô C1", zoneId: "z3", area: 15000, teamLeader: "Lê Văn C", teamLeaderId: "tl3", coordinates: noCoord }, mkCrops("good")),
  buildPlot({ id: "p10", name: "Lô C2", zoneId: "z3", area: 15000, teamLeader: "Phạm Thị D", teamLeaderId: "tl4", coordinates: noCoord }, mkCrops("good")),
  buildPlot({ id: "p11", name: "Lô C3", zoneId: "z3", area: 15000, teamLeader: "Phạm Thị D", teamLeaderId: "tl4", coordinates: noCoord }, mkCrops("warning")),
  buildPlot({ id: "p12", name: "Lô C4", zoneId: "z3", area: 15000, teamLeader: "Vũ Thị F", teamLeaderId: "tl6", coordinates: noCoord }, mkCrops("good")),
  // Vùng D (z4): chủ yếu đỏ
  buildPlot({ id: "p13", name: "Lô D1", zoneId: "z4", area: 8750, teamLeader: "Trần Thị B", teamLeaderId: "tl2", coordinates: noCoord }, mkCrops("danger")),
  buildPlot({ id: "p14", name: "Lô D2", zoneId: "z4", area: 8750, teamLeader: "Vũ Thị F", teamLeaderId: "tl6", coordinates: noCoord }, mkCrops("danger")),
  buildPlot({ id: "p15", name: "Lô D3", zoneId: "z4", area: 8750, teamLeader: "Vũ Thị F", teamLeaderId: "tl6", coordinates: noCoord }, mkCrops("warning")),
  buildPlot({ id: "p16", name: "Lô D4", zoneId: "z4", area: 8750, teamLeader: "Vũ Thị F", teamLeaderId: "tl6", coordinates: noCoord }, mkCrops("danger")),
];

// Một tổ trưởng có thể phụ trách NHIỀU lô (plotIds), ở nhiều zone khác nhau.
export const teamLeaders = [
  { id: "tl1", name: "Nguyễn Văn A", phone: "0901234567", email: "vana@nongtrai.vn", plotId: "p1", plotIds: ["p1", "p2", "p5"], status: "active" },
  { id: "tl2", name: "Trần Thị B", phone: "0902345678", email: "thib@nongtrai.vn", plotId: "p3", plotIds: ["p3", "p4", "p13"], status: "active" },
  { id: "tl3", name: "Lê Văn C", phone: "0903456789", email: "vanc@nongtrai.vn", plotId: "p6", plotIds: ["p6", "p7", "p9"], status: "active" },
  { id: "tl4", name: "Phạm Thị D", phone: "0904567890", email: "thid@nongtrai.vn", plotId: "p8", plotIds: ["p8", "p10", "p11"], status: "active" },
  { id: "tl5", name: "Hoàng Văn E", phone: "0905678901", email: "vane@nongtrai.vn", plotId: "", plotIds: [], status: "inactive" },
  { id: "tl6", name: "Vũ Thị F", phone: "0906789012", email: "thif@nongtrai.vn", plotId: "p12", plotIds: ["p12", "p14", "p15", "p16"], status: "active" },
];

export const teamMembers = [
  { id: "tm1", name: "Nguyễn Văn G", phone: "0907890123", teamLeaderId: "tl1", status: "active" },
  { id: "tm2", name: "Trần Thị H", phone: "0908901234", teamLeaderId: "tl1", status: "active" },
  { id: "tm3", name: "Lê Văn I", phone: "0909012345", teamLeaderId: "tl2", status: "active" },
  { id: "tm4", name: "Phạm Thị K", phone: "0900123456", teamLeaderId: "tl3", status: "active" },
];

export const processes = [
  { 
    id: "proc1", 
    name: "Quy trình Gấc", 
    crop: "Gấc",
    steps: [
      { step: 1, description: "Chuẩn bị đất", workPerHa: 10, frequency: "1 lần/chu kỳ", scope: "Toàn bộ lô", requirePhoto: true },
      { step: 2, description: "Gieo hạt", workPerHa: 5, frequency: "1 lần/chu kỳ", scope: "Toàn bộ lô", requirePhoto: true },
      { step: 3, description: "Tưới nước", workPerHa: 2, frequency: "2 ngày/lần", scope: "Toàn bộ lô", requirePhoto: false },
      { step: 4, description: "Bón phân", workPerHa: 3, frequency: "7 ngày/lần", scope: "Toàn bộ lô", requirePhoto: true },
      { step: 5, description: "Dựng giàn", workPerHa: 15, frequency: "1 lần/chu kỳ", scope: "Toàn bộ lô", requirePhoto: true },
      { step: 6, description: "Kiểm tra sâu bệnh", workPerHa: 2, frequency: "3 ngày/lần", scope: "Toàn bộ lô", requirePhoto: true },
    ]
  },
  { 
    id: "proc2", 
    name: "Quy trình Sâm", 
    crop: "Sâm",
    steps: [
      { step: 1, description: "Chuẩn bị đất", workPerHa: 12, frequency: "1 lần/chu kỳ", scope: "Toàn bộ lô", requirePhoto: true },
      { step: 2, description: "Gieo hạt", workPerHa: 6, frequency: "1 lần/chu kỳ", scope: "Toàn bộ lô", requirePhoto: true },
      { step: 3, description: "Tưới nước", workPerHa: 3, frequency: "1 ngày/lần", scope: "Toàn bộ lô", requirePhoto: false },
      { step: 4, description: "Bón phân", workPerHa: 4, frequency: "10 ngày/lần", scope: "Toàn bộ lô", requirePhoto: true },
      { step: 5, description: "Làm cỏ", workPerHa: 5, frequency: "7 ngày/lần", scope: "Toàn bộ lô", requirePhoto: false },
    ]
  },
];

// Mỗi lô có 2 chu kỳ song song: Gấc (proc1) tầng trên + Sâm (proc2) tầng dưới — tự sinh cho 16 lô.
export const cropCycles = plots.flatMap((p, i) => {
  const d = (i % 9) + 1;
  return [
    { id: `cc${i + 1}g`, plotId: p.id, crop: "Gấc", startDate: `2026-05-0${d}`, processId: "proc1", status: "active" },
    { id: `cc${i + 1}s`, plotId: p.id, crop: "Sâm", startDate: `2026-04-1${d}`, processId: "proc2", status: "active" },
  ];
});

// Mỗi việc gắn với 1 cây (crop) trên 1 lô — Gấc và Sâm có lịch việc riêng dù cùng lô.
export const tasks = [
  // ----- Hôm nay 2026-06-14 -----
  // Lô A1 (tl1)
  { id: "t1", title: "Tưới nước giàn gấc", plotId: "p1", crop: "Gấc", date: "2026-06-14", status: "completed", teamLeaderId: "tl1", requirePhoto: false, priority: "normal" },
  { id: "t2", title: "Bón phân gốc gấc", plotId: "p1", crop: "Gấc", date: "2026-06-14", status: "in-progress", teamLeaderId: "tl1", requirePhoto: true, priority: "high" },
  { id: "t3", title: "Làm cỏ luống sâm", plotId: "p1", crop: "Sâm", date: "2026-06-14", status: "pending", teamLeaderId: "tl1", requirePhoto: false, priority: "normal" },
  // Lô A2 (tl1)
  { id: "t4", title: "Tưới nước giàn gấc", plotId: "p2", crop: "Gấc", date: "2026-06-14", status: "completed", teamLeaderId: "tl1", requirePhoto: false, priority: "normal" },
  { id: "t5", title: "Kiểm tra củ sâm", plotId: "p2", crop: "Sâm", date: "2026-06-14", status: "completed", teamLeaderId: "tl1", requirePhoto: true, priority: "normal" },
  // Lô B1 (tl1)
  { id: "t6", title: "Tưới nước giàn gấc", plotId: "p5", crop: "Gấc", date: "2026-06-14", status: "overdue", teamLeaderId: "tl1", requirePhoto: false, priority: "urgent" },
  { id: "t7", title: "Kiểm tra sâu đục thân gấc", plotId: "p5", crop: "Gấc", date: "2026-06-14", status: "pending", teamLeaderId: "tl1", requirePhoto: true, priority: "high" },
  { id: "t8", title: "Bón phân sâm", plotId: "p5", crop: "Sâm", date: "2026-06-14", status: "pending", teamLeaderId: "tl1", requirePhoto: true, priority: "normal" },
  // Lô B2 (tl3) — bất thường
  { id: "t9", title: "Dựng lại giàn gấc", plotId: "p6", crop: "Gấc", date: "2026-06-14", status: "in-progress", teamLeaderId: "tl3", requirePhoto: true, priority: "high" },
  { id: "t10", title: "Làm cỏ luống sâm", plotId: "p6", crop: "Sâm", date: "2026-06-14", status: "pending", teamLeaderId: "tl3", requirePhoto: false, priority: "normal" },
  // Lô D1 (tl2) — quá hạn
  { id: "t11", title: "Tưới nước giàn gấc", plotId: "p13", crop: "Gấc", date: "2026-06-14", status: "overdue", teamLeaderId: "tl2", requirePhoto: false, priority: "urgent" },
  { id: "t12", title: "Bón phân sâm", plotId: "p13", crop: "Sâm", date: "2026-06-14", status: "pending", teamLeaderId: "tl2", requirePhoto: true, priority: "high" },
  // ----- Sắp tới (tl1) -----
  { id: "t13", title: "Kiểm tra sâu bệnh gấc", plotId: "p1", crop: "Gấc", date: "2026-06-15", status: "pending", teamLeaderId: "tl1", requirePhoto: true, priority: "normal" },
  { id: "t14", title: "Tưới nước luống sâm", plotId: "p1", crop: "Sâm", date: "2026-06-15", status: "pending", teamLeaderId: "tl1", requirePhoto: false, priority: "normal" },
  { id: "t15", title: "Bón phân giàn gấc", plotId: "p5", crop: "Gấc", date: "2026-06-16", status: "pending", teamLeaderId: "tl1", requirePhoto: true, priority: "high" },
  { id: "t16", title: "Làm cỏ luống sâm", plotId: "p5", crop: "Sâm", date: "2026-06-16", status: "pending", teamLeaderId: "tl1", requirePhoto: false, priority: "normal" },
  { id: "t17", title: "Tưới nước giàn gấc", plotId: "p2", crop: "Gấc", date: "2026-06-17", status: "pending", teamLeaderId: "tl1", requirePhoto: false, priority: "normal" },
  { id: "t18", title: "Kiểm tra củ sâm", plotId: "p2", crop: "Sâm", date: "2026-06-17", status: "pending", teamLeaderId: "tl1", requirePhoto: true, priority: "normal" },
];

export const anomalies = [
  { id: "a1", type: "Sâu bệnh", plotId: "p5", crop: "Gấc", reporter: "Nguyễn Văn A", date: "2026-06-13", description: "Phát hiện sâu đục thân trên khoảng 10% cây gấc", status: "pending", photos: ["https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400"] },
  { id: "a2", type: "Hỏng giàn", plotId: "p13", crop: "Gấc", reporter: "Trần Thị B", date: "2026-06-12", description: "Giàn gấc bị đổ do mưa gió, cần sửa chữa", status: "in-progress", photos: ["https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400"] },
  { id: "a3", type: "Úng nước", plotId: "p6", crop: "Sâm", date: "2026-06-11", reporter: "Lê Văn C", description: "Luống sâm góc đông bị úng nước sau mưa", status: "resolved", photos: ["https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=400"] },
];

export const notifications = [
  { id: "n1", type: "overdue", title: "Công việc quá hạn", description: "Tưới nước tại Lô B1 đã quá hạn", date: "2026-06-14", read: false, taskId: "t4" },
  { id: "n2", type: "anomaly", title: "Bất thường mới", description: "Phát hiện sâu bệnh tại Lô B1", date: "2026-06-13", read: false, anomalyId: "a1" },
  { id: "n3", type: "report", title: "Chưa gửi báo cáo", description: "Lô D1 chưa gửi báo cáo ngày 13/06", date: "2026-06-13", read: true },
  { id: "n4", type: "anomaly", title: "Bất thường đang xử lý", description: "Hỏng giàn tại Lô D1 đang được sửa chữa", date: "2026-06-12", read: true, anomalyId: "a2" },
];

// completed = số việc đã hoàn thành; notDone = số việc chưa hoàn thành (còn lại trong kỳ)
// byCrop: tách RIÊNG chỉ số theo từng cây (Gấc/Sâm) — tự tính từ tổng theo tỷ lệ gacShare.
const KPI_FIELDS = ["onTime", "overdue", "completed", "notDone", "fullReport", "anomalies", "totalWork"] as const;
type KpiBase = { teamLeaderId: string; name: string; onTime: number; overdue: number; completed: number; notDone: number; fullReport: number; anomalies: number; totalWork: number };

function withCropSplit(row: KpiBase, gacShare: number) {
  const gac: Record<string, number> = {};
  const sam: Record<string, number> = {};
  for (const k of KPI_FIELDS) {
    gac[k] = Math.round((row[k] as number) * gacShare);
    sam[k] = (row[k] as number) - gac[k];
  }
  return { ...row, byCrop: { "Gấc": gac, "Sâm": sam } as Record<string, Record<string, number>> };
}

export const kpiData = ([
  { teamLeaderId: "tl1", name: "Nguyễn Văn A", onTime: 45, overdue: 3, completed: 48, notDone: 5, fullReport: 46, anomalies: 1, totalWork: 480 },
  { teamLeaderId: "tl2", name: "Trần Thị B", onTime: 50, overdue: 2, completed: 52, notDone: 2, fullReport: 52, anomalies: 0, totalWork: 520 },
  { teamLeaderId: "tl3", name: "Lê Văn C", onTime: 38, overdue: 7, completed: 45, notDone: 9, fullReport: 40, anomalies: 3, totalWork: 450 },
  { teamLeaderId: "tl4", name: "Phạm Thị D", onTime: 42, overdue: 4, completed: 46, notDone: 6, fullReport: 44, anomalies: 2, totalWork: 460 },
  { teamLeaderId: "tl5", name: "Hoàng Văn E", onTime: 48, overdue: 1, completed: 49, notDone: 3, fullReport: 49, anomalies: 0, totalWork: 490 },
  { teamLeaderId: "tl6", name: "Vũ Thị F", onTime: 35, overdue: 8, completed: 43, notDone: 11, fullReport: 38, anomalies: 4, totalWork: 430 },
] as KpiBase[]).map((r, i) => withCropSplit(r, [0.55, 0.5, 0.6, 0.5, 0.45, 0.6][i] ?? 0.5));

export const mobileNotifications = [
  { id: "mn1", type: "new-task", title: "Công việc mới", description: "Tưới nước - Lô A1 - Gấc", date: "2026-06-14 08:00", read: false },
  { id: "mn2", type: "rescheduled", title: "Việc bị lùi lịch", description: "Bón phân đã lùi sang ngày 15/06", date: "2026-06-14 07:30", read: false },
  { id: "mn3", type: "reassigned", title: "Việc được gán lại", description: "Kiểm tra sâu bệnh đã gán cho bạn", date: "2026-06-13 15:00", read: true },
  { id: "mn4", type: "report-success", title: "Báo cáo gửi thành công", description: "Báo cáo ngày 13/06 đã được ghi nhận", date: "2026-06-13 18:00", read: true },
];

export const offlineQueue = [
  { id: "oq1", type: "task-complete", title: "Hoàn thành: Tưới nước - Lô A1", date: "2026-06-14 10:30", synced: false },
  { id: "oq2", type: "daily-report", title: "Báo cáo cuối ngày 13/06", date: "2026-06-13 18:00", synced: false },
];

// ===== Bổ sung theo yêu cầu UI =====

// Quy ước màu trạng thái thống nhất toàn hệ thống
export const statusLegend = [
  { key: "good", label: "Bình thường / Hoàn thành", cls: "bg-green-100 text-green-800", dot: "bg-green-500" },
  { key: "warning", label: "Cảnh báo / Cần chú ý", cls: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  { key: "danger", label: "Quá hạn / Bất thường", cls: "bg-red-100 text-red-800", dot: "bg-red-500" },
  { key: "inactive", label: "Nghỉ / Không hoạt động", cls: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
  { key: "info", label: "Đang xử lý / Đã gửi", cls: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
];

// Yêu cầu hỗ trợ từ tổ trưởng. status: pending | approved | rejected | replied | done
export const supportRequests = [
  { id: "sr1", teamLeaderId: "tl1", reporter: "Nguyễn Văn A", plotId: "p5", type: "Vật tư", content: "Cần thêm 2 bao phân NPK cho lô B1, hiện đã hết.", photos: ["https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400"], sentAt: "2026-06-14 09:12", status: "pending", reply: "" },
  { id: "sr2", teamLeaderId: "tl2", reporter: "Trần Thị B", plotId: "p13", type: "Nhân lực", content: "Lô D1 cần thêm 3 người để kịp thu hoạch trong ngày.", photos: [], sentAt: "2026-06-14 08:40", status: "approved", reply: "Đã điều thêm 3 người từ tổ dự phòng." },
  { id: "sr3", teamLeaderId: "tl3", reporter: "Lê Văn C", plotId: "p6", type: "Kỹ thuật", content: "Cây gấc có dấu hiệu vàng lá bất thường, cần kỹ sư kiểm tra.", photos: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400"], sentAt: "2026-06-13 16:20", status: "replied", reply: "Kỹ sư sẽ xuống kiểm tra sáng mai. Tạm thời ngừng bón phân." },
];
export const supportTypes = ["Vật tư", "Nhân lực", "Kỹ thuật", "Thiết bị", "Khác"];

// Lịch sử báo cáo của tổ trưởng theo lô/ngày. abnormal: có bất thường không. status: pending | reviewed | replied
export const teamLeaderReports = [
  { id: "r1", teamLeaderId: "tl1", reporter: "Nguyễn Văn A", plotId: "p1", crop: "Gấc", date: "2026-06-14", content: "Đã tưới và bón phân xong, cây phát triển tốt.", photos: ["https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=400"], abnormal: false, status: "reviewed", reply: "" },
  { id: "r2", teamLeaderId: "tl1", reporter: "Nguyễn Văn A", plotId: "p5", crop: "Gấc", date: "2026-06-14", content: "Phát hiện sâu đục thân ~10% cây gấc, đã khoanh vùng.", photos: ["https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400"], abnormal: true, status: "replied", reply: "Phun thuốc sinh học ngay, báo lại sau 2 ngày." },
  { id: "r3", teamLeaderId: "tl2", reporter: "Trần Thị B", plotId: "p3", crop: "Sâm", date: "2026-06-14", content: "Hoàn thành toàn bộ việc trong ngày.", photos: [], abnormal: false, status: "pending", reply: "" },
  { id: "r4", teamLeaderId: "tl3", reporter: "Lê Văn C", plotId: "p6", crop: "Sâm", date: "2026-06-13", content: "Luống sâm bị úng nước do mưa, đã khơi rãnh thoát.", photos: ["https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400"], abnormal: true, status: "replied", reply: "Đã duyệt cấp vật tư khơi rãnh." },
];

// Cài đặt hệ thống
export const appSettings = {
  appName: "AKF — Quản lý sản xuất nông trại",
  companyName: "Công ty Nông nghiệp ASC King Farm",
  contact: "0900 000 000 · contact@ascking.vn",
  logoText: "AKF",
};
export const emailSettings = {
  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  fromEmail: "noreply@ascking.vn",
  fromName: "AKF Hệ thống",
  enabled: true,
};

// ===== Helpers =====
export function leaderPlots(leaderId: string) {
  const l = teamLeaders.find((t) => t.id === leaderId);
  const ids = l?.plotIds && l.plotIds.length ? l.plotIds : l?.plotId ? [l.plotId] : [];
  return plots.filter((p) => ids.includes(p.id));
}
export function plotName(plotId: string) {
  return plots.find((p) => p.id === plotId)?.name || plotId;
}
// Danh sách cây (kèm tiến độ/trạng thái) trên một lô
export function plotCrops(plotId: string): CropOnPlot[] {
  return plots.find((p) => p.id === plotId)?.crops ?? [];
}
export function zoneName(zoneId: string) {
  return zones.find((z) => z.id === zoneId)?.name || zoneId;
}
// Thống kê diện tích đang gieo trồng (m2 -> ha)
export function areaStats() {
  const activePlots = plots.filter((p) => p.status !== "inactive");
  const ha = (m2: number) => m2 / 10000;
  const sum = (arr: typeof plots) => arr.reduce((s, p) => s + ha(p.area), 0);
  const byCrop = (kw: string) => sum(activePlots.filter((p) => p.crop.includes(kw)));
  const activeZoneIds = new Set(activePlots.map((p) => p.zoneId));
  return {
    totalHa: Math.round(sum(activePlots) * 10) / 10,
    gacHa: Math.round(byCrop("Gấc") * 10) / 10,
    samHa: Math.round(byCrop("Sâm") * 10) / 10,
    zones: activeZoneIds.size,
    plots: activePlots.length,
  };
}
// Thống kê tổ hoàn thành việc trong ngày (dựa trên tiến độ lô do tổ phụ trách)
export function teamCompletionToday() {
  const active = teamLeaders.filter((t) => t.status === "active" && leaderPlots(t.id).length);
  const done = active.filter((t) => leaderPlots(t.id).every((p) => p.done >= p.total)).length;
  const withSupport = new Set(supportRequests.filter((s) => s.status === "pending").map((s) => s.teamLeaderId)).size;
  return { total: active.length, done, pending: active.length - done, withSupport };
}

// ===== Tọa độ GPS demo cho bản đồ vệ tinh (mock quanh khu Đà Lạt) =====
// Mỗi vùng là 1 ô vuông trong lưới 2x2; các lô là ô nhỏ bên trong vùng.
export type LatLng = [number, number];
const GEO_ORIGIN = { lat: 11.9600, lng: 108.4360 }; // góc Tây-Bắc của khu trại
const ZONE_DEG = 0.013;   // cạnh vùng (~1.4km)
const ZONE_GAP = 0;       // các vùng SÁT NHAU (không khoảng cách)
const ZONE_CELL: Record<string, [number, number]> = { z1: [0, 0], z2: [1, 0], z3: [0, 1], z4: [1, 1] };

function zoneBox(zoneId: string) {
  const [col, row] = ZONE_CELL[zoneId] ?? [0, 0];
  const north = GEO_ORIGIN.lat - row * (ZONE_DEG + ZONE_GAP);
  const west = GEO_ORIGIN.lng + col * (ZONE_DEG + ZONE_GAP);
  return { north, south: north - ZONE_DEG, west, east: west + ZONE_DEG };
}
function rectPolygon(north: number, south: number, east: number, west: number): LatLng[] {
  return [[north, west], [north, east], [south, east], [south, west]];
}

export const zoneGeo: Record<string, { polygon: LatLng[]; center: LatLng }> = {};
zones.forEach((z) => {
  const b = zoneBox(z.id);
  zoneGeo[z.id] = {
    polygon: rectPolygon(b.north, b.south, b.east, b.west),
    center: [(b.north + b.south) / 2, (b.east + b.west) / 2],
  };
});

export const plotGeo: Record<string, { polygon: LatLng[]; center: LatLng }> = {};
zones.forEach((z) => {
  const b = zoneBox(z.id);
  const zonePlots = plots.filter((p) => p.zoneId === z.id);
  const n = zonePlots.length || 1;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cellW = (b.east - b.west) / cols;
  const cellH = (b.north - b.south) / rows;
  // Lô phủ KÍN vùng (không chừa lề) — chỉ phân ô lưới
  zonePlots.forEach((p, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const west = b.west + c * cellW;
    const east = b.west + (c + 1) * cellW;
    const north = b.north - r * cellH;
    const south = b.north - (r + 1) * cellH;
    plotGeo[p.id] = { polygon: rectPolygon(north, south, east, west), center: [(north + south) / 2, (east + west) / 2] };
  });
});

// Tâm toàn khu (để bản đồ tự canh giữa)
export const farmCenter: LatLng = [GEO_ORIGIN.lat - (ZONE_DEG + ZONE_GAP) / 2, GEO_ORIGIN.lng + (ZONE_DEG + ZONE_GAP) / 2];
