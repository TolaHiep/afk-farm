// Mock data for farm management system

export const zones = [
  { id: "z1", name: "Vùng A", area: 50000, plots: 5, status: "good" },
  { id: "z2", name: "Vùng B", area: 45000, plots: 4, status: "warning" },
  { id: "z3", name: "Vùng C", area: 60000, plots: 6, status: "good" },
  { id: "z4", name: "Vùng D", area: 35000, plots: 3, status: "danger" },
];

export const plots = [
  { id: "p1", name: "Lô A1", zoneId: "z1", area: 10000, teamLeader: "Nguyễn Văn A", crop: "Gấc", status: "good", coordinates: [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.2]] },
  { id: "p2", name: "Lô A2", zoneId: "z1", area: 12000, teamLeader: "Trần Thị B", crop: "Sâm", status: "good", coordinates: [[0.2, 0.1], [0.3, 0.1], [0.3, 0.2], [0.2, 0.2]] },
  { id: "p3", name: "Lô B1", zoneId: "z2", area: 15000, teamLeader: "Lê Văn C", crop: "Gấc", status: "warning", coordinates: [[0.1, 0.3], [0.2, 0.3], [0.2, 0.4], [0.1, 0.4]] },
  { id: "p4", name: "Lô B2", zoneId: "z2", area: 11000, teamLeader: "Phạm Thị D", crop: "Sâm", status: "good", coordinates: [[0.2, 0.3], [0.3, 0.3], [0.3, 0.4], [0.2, 0.4]] },
  { id: "p5", name: "Lô C1", zoneId: "z3", area: 18000, teamLeader: "Hoàng Văn E", crop: "Gấc", status: "good", coordinates: [[0.4, 0.1], [0.5, 0.1], [0.5, 0.3], [0.4, 0.3]] },
  { id: "p6", name: "Lô D1", zoneId: "z4", area: 13000, teamLeader: "Vũ Thị F", crop: "Sâm", status: "danger", coordinates: [[0.4, 0.4], [0.5, 0.4], [0.5, 0.5], [0.4, 0.5]] },
];

export const teamLeaders = [
  { id: "tl1", name: "Nguyễn Văn A", phone: "0901234567", plotId: "p1", status: "active" },
  { id: "tl2", name: "Trần Thị B", phone: "0902345678", plotId: "p2", status: "active" },
  { id: "tl3", name: "Lê Văn C", phone: "0903456789", plotId: "p3", status: "active" },
  { id: "tl4", name: "Phạm Thị D", phone: "0904567890", plotId: "p4", status: "active" },
  { id: "tl5", name: "Hoàng Văn E", phone: "0905678901", plotId: "p5", status: "active" },
  { id: "tl6", name: "Vũ Thị F", phone: "0906789012", plotId: "p6", status: "active" },
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

export const cropCycles = [
  { id: "cc1", plotId: "p1", crop: "Gấc", startDate: "2026-05-01", processId: "proc1", status: "active" },
  { id: "cc2", plotId: "p2", crop: "Sâm", startDate: "2026-04-15", processId: "proc2", status: "active" },
  { id: "cc3", plotId: "p3", crop: "Gấc", startDate: "2026-05-10", processId: "proc1", status: "active" },
  { id: "cc4", plotId: "p4", crop: "Sâm", startDate: "2026-04-20", processId: "proc2", status: "active" },
  { id: "cc5", plotId: "p5", crop: "Gấc", startDate: "2026-05-05", processId: "proc1", status: "active" },
  { id: "cc6", plotId: "p6", crop: "Sâm", startDate: "2026-04-25", processId: "proc2", status: "active" },
];

export const tasks = [
  { id: "t1", title: "Tưới nước", plotId: "p1", crop: "Gấc", date: "2026-06-14", status: "pending", teamLeaderId: "tl1", requirePhoto: false, priority: "normal" },
  { id: "t2", title: "Bón phân", plotId: "p1", crop: "Gấc", date: "2026-06-14", status: "in-progress", teamLeaderId: "tl1", requirePhoto: true, priority: "high" },
  { id: "t3", title: "Kiểm tra sâu bệnh", plotId: "p2", crop: "Sâm", date: "2026-06-14", status: "completed", teamLeaderId: "tl2", requirePhoto: true, priority: "normal" },
  { id: "t4", title: "Tưới nước", plotId: "p3", crop: "Gấc", date: "2026-06-14", status: "overdue", teamLeaderId: "tl3", requirePhoto: false, priority: "urgent" },
  { id: "t5", title: "Làm cỏ", plotId: "p4", crop: "Sâm", date: "2026-06-15", status: "pending", teamLeaderId: "tl4", requirePhoto: false, priority: "normal" },
  { id: "t6", title: "Tưới nước", plotId: "p5", crop: "Gấc", date: "2026-06-15", status: "pending", teamLeaderId: "tl5", requirePhoto: false, priority: "normal" },
  { id: "t7", title: "Bón phân", plotId: "p6", crop: "Sâm", date: "2026-06-16", status: "pending", teamLeaderId: "tl6", requirePhoto: true, priority: "high" },
  { id: "t8", title: "Kiểm tra sâu bệnh", plotId: "p1", crop: "Gấc", date: "2026-06-17", status: "pending", teamLeaderId: "tl1", requirePhoto: true, priority: "normal" },
  { id: "t9", title: "Tưới nước", plotId: "p2", crop: "Sâm", date: "2026-06-18", status: "pending", teamLeaderId: "tl2", requirePhoto: false, priority: "normal" },
  { id: "t10", title: "Làm cỏ", plotId: "p3", crop: "Gấc", date: "2026-06-19", status: "pending", teamLeaderId: "tl3", requirePhoto: false, priority: "normal" },
];

export const anomalies = [
  { id: "a1", type: "Sâu bệnh", plotId: "p3", crop: "Gấc", reporter: "Lê Văn C", date: "2026-06-13", description: "Phát hiện sâu đục thân trên khoảng 10% cây", status: "pending", photos: ["https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400"] },
  { id: "a2", type: "Hỏng giàn", plotId: "p6", crop: "Sâm", reporter: "Vũ Thị F", date: "2026-06-12", description: "Giàn đỡ bị đổ do mưa gió, cần sửa chữa", status: "in-progress", photos: ["https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400"] },
  { id: "a3", type: "Úng nước", plotId: "p4", crop: "Sâm", date: "2026-06-11", reporter: "Phạm Thị D", description: "Khu vực góc đông bị úng nước sau mưa", status: "resolved", photos: ["https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=400"] },
];

export const notifications = [
  { id: "n1", type: "overdue", title: "Công việc quá hạn", description: "Tưới nước tại Lô B1 đã quá hạn", date: "2026-06-14", read: false, taskId: "t4" },
  { id: "n2", type: "anomaly", title: "Bất thường mới", description: "Phát hiện sâu bệnh tại Lô B1", date: "2026-06-13", read: false, anomalyId: "a1" },
  { id: "n3", type: "report", title: "Chưa gửi báo cáo", description: "Lô D1 chưa gửi báo cáo ngày 13/06", date: "2026-06-13", read: true },
  { id: "n4", type: "anomaly", title: "Bất thường đang xử lý", description: "Hỏng giàn tại Lô D1 đang được sửa chữa", date: "2026-06-12", read: true, anomalyId: "a2" },
];

export const kpiData = [
  { teamLeaderId: "tl1", name: "Nguyễn Văn A", onTime: 45, overdue: 3, completed: 48, fullReport: 46, anomalies: 1, totalWork: 480 },
  { teamLeaderId: "tl2", name: "Trần Thị B", onTime: 50, overdue: 2, completed: 52, fullReport: 52, anomalies: 0, totalWork: 520 },
  { teamLeaderId: "tl3", name: "Lê Văn C", onTime: 38, overdue: 7, completed: 45, fullReport: 40, anomalies: 3, totalWork: 450 },
  { teamLeaderId: "tl4", name: "Phạm Thị D", onTime: 42, overdue: 4, completed: 46, fullReport: 44, anomalies: 2, totalWork: 460 },
  { teamLeaderId: "tl5", name: "Hoàng Văn E", onTime: 48, overdue: 1, completed: 49, fullReport: 49, anomalies: 0, totalWork: 490 },
  { teamLeaderId: "tl6", name: "Vũ Thị F", onTime: 35, overdue: 8, completed: 43, fullReport: 38, anomalies: 4, totalWork: 430 },
];

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
