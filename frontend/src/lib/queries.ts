import { api } from "./api";
import type { PhotoMeta, TaskPhoto } from "./capture";

export type User = { email: string; full_name: string; phone?: string; role: "admin" | "team_leader"; roles: string[] };

// Auth
export const apiMe = () => api.get("auth_api.me") as Promise<User>;
export const apiLogin = (usr: string, pwd: string) => api.post("auth_api.login", { usr, pwd }) as Promise<User>;
export const apiLogout = () => api.post("auth_api.logout");

// Admin — vùng/lô/bản đồ/lịch
export const getZones = () => api.get("admin_api.list_zones") as Promise<any[]>;
export const getPlots = (zone?: string) =>
  api.get("admin_api.list_plots", zone ? { zone } : undefined) as Promise<any[]>;
export const getHeatmap = () => api.get("admin_api.heatmap") as Promise<{ zones: any[]; plots: any[] }>;
export const getPlot = (name: string) => api.get("admin_api.get_plot", { name }) as Promise<any>;
export const createZone = (p: Record<string, unknown>) => api.post("admin_api.create_zone", p);
export const updateZone = (name: string, p: Record<string, unknown>) => api.post("admin_api.update_zone", { name, ...p });
export const deleteZone = (name: string) => api.post("admin_api.delete_zone", { name });
export const createPlot = (p: Record<string, unknown>) => api.post("admin_api.create_plot", p);
export const createPlotsBulk = (
  zone: string,
  plots: Array<{ block_name: string; area: number; boundary?: string; crops?: string[] }>,
  teamLeader?: string,
) => api.post("admin_api.create_plots_bulk", { zone, plots, team_leader: teamLeader });
export const updatePlot = (name: string, p: Record<string, unknown>) => api.post("admin_api.update_plot", { name, ...p });
export const deletePlot = (name: string) => api.post("admin_api.delete_plot", { name });
export const getCalendar = (fromDate: string, days = 10) =>
  api.get("admin_api.calendar", { from_date: fromDate, days: String(days) }) as Promise<any[]>;
export const rescheduleTask = (task: string, newDate: string) =>
  api.post("admin_api.reschedule_task", { task, new_date: newDate });
export const reassignTask = (task: string, teamLeader: string) =>
  api.post("admin_api.reassign_task", { task, team_leader: teamLeader });
export const getTaskPhotos = (task: string) => api.get("admin_api.task_photos", { task }) as Promise<TaskPhoto[]>;

// Admin — tổ, quy trình, chu kỳ
export const getTeamLeaders = () => api.get("admin_api.list_team_leaders") as Promise<any[]>;
export const getTeamMembers = () => api.get("admin_api.list_team_members") as Promise<any[]>;
export const getProcesses = () => api.get("admin_api.list_processes") as Promise<any[]>;
export const getCropCycles = () => api.get("admin_api.list_crop_cycles") as Promise<any[]>;

// Tổ trưởng (CRUD) — "xóa" = vô hiệu hóa
export const createTeamLeader = (p: { email: string; full_name: string; phone?: string; password?: string; status?: string; plot_ids?: string[] }) =>
  api.post("admin_api.create_team_leader", p);
export const updateTeamLeader = (name: string, p: Record<string, unknown>) =>
  api.post("admin_api.update_team_leader", { name, ...p });
export const deleteTeamLeader = (name: string) => api.post("admin_api.delete_team_leader", { name });

// Tổ viên (CRUD)
export const createTeamMember = (p: { member_name: string; team_leader?: string; phone?: string; status?: string }) =>
  api.post("admin_api.create_team_member", p);
export const updateTeamMember = (name: string, p: Record<string, unknown>) =>
  api.post("admin_api.update_team_member", { name, ...p });
export const deleteTeamMember = (name: string) => api.post("admin_api.delete_team_member", { name });

// Quy trình (CRUD)
export const createProcess = (p: { process_name: string; crop?: string; steps?: unknown[]; cycle_length_days?: number }) =>
  api.post("admin_api.create_process", p);
export const updateProcess = (name: string, p: Record<string, unknown>) =>
  api.post("admin_api.update_process", { name, ...p });
export const deleteProcess = (name: string) => api.post("admin_api.delete_process", { name });

// Chu kỳ cây trồng (CRUD)
export const createCropCycle = (p: { block: string; crop: string; start_date: string; cultivation_process?: string; status?: string }) =>
  api.post("admin_api.create_crop_cycle", p);
export const updateCropCycle = (name: string, p: Record<string, unknown>) =>
  api.post("admin_api.update_crop_cycle", { name, ...p });
export const deleteCropCycle = (name: string) => api.post("admin_api.delete_crop_cycle", { name });

// Bất thường — cập nhật trạng thái / phản hồi
export const updateAnomaly = (name: string, p: { status?: string; reply?: string }) =>
  api.post("admin_api.update_anomaly", { name, ...p });

// Admin — báo cáo/hỗ trợ/bất thường/thông báo/cài đặt/dashboard
export const getAnomalies = () => api.get("admin_api.list_anomalies") as Promise<any[]>;
export const getReports = () => api.get("admin_api.list_reports") as Promise<any[]>;
export const getSupport = () => api.get("admin_api.list_support") as Promise<any[]>;
export const replySupport = (name: string, reply: string, status = "replied") =>
  api.post("admin_api.reply_support", { name, reply, status });
export const getNotifications = () => api.get("admin_api.list_notifications") as Promise<any[]>;
export const getSettings = () => api.get("admin_api.get_settings") as Promise<any>;
export const saveSettings = (s: Record<string, unknown>) => api.post("admin_api.save_settings", s);
export const uploadLogo = (dataUrl: string) => api.post("admin_api.upload_logo", { data_url: dataUrl }) as Promise<{ ok: boolean; logoUrl: string }>;
export const sendTestEmail = (to?: string) => api.post("admin_api.send_test_email", to ? { to } : {}) as Promise<{ ok: boolean; reason?: string }>;
export const sendDailyNotifications = () => api.post("admin_api.send_daily_notifications", {}) as Promise<{ ok: boolean; sent: number; overdue: number; anomalies: number; reason?: string }>;
export const markReportReviewed = (name: string) => api.post("admin_api.mark_report_reviewed", { name }) as Promise<{ ok: boolean; status: string }>;
export const replyReport = (name: string, reply: string, status = "replied") => api.post("admin_api.reply_report", { name, reply, status }) as Promise<{ ok: boolean }>;
export const getDashboard = (date?: string) =>
  api.get("admin_api.dashboard", date ? { date } : undefined) as Promise<any>;
export const getTeamKpi = () => api.get("admin_api.team_kpi") as Promise<any[]>;

// Field (mobile)
export const getTodayTasks = (date?: string) =>
  api.get("field_api.today_tasks", date ? { date } : undefined) as Promise<any[]>;
export const getUpcomingTasks = (fromDate?: string, days = 10) =>
  api.get("field_api.upcoming_tasks", fromDate ? { from_date: fromDate, days: String(days) } : undefined) as Promise<any[]>;
export const getTaskDetail = (task: string) => api.get("field_api.task_detail", { task }) as Promise<any>;
export const completeTask = (task: string, clientUuid?: string, photos?: string[], photoMeta?: PhotoMeta[]) =>
  api.post("field_api.complete_task", { task, client_uuid: clientUuid, photos, photo_meta: photoMeta });
export const submitReport = (p: { block: string; crop: string; date: string; content: string; photos?: string[]; abnormal?: number; client_uuid?: string }) =>
  api.post("field_api.submit_report", p);
export const getMyReports = () => api.get("field_api.my_reports") as Promise<any[]>;
export const submitSupport = (p: { block: string; type: string; content: string; photos?: string[] }) =>
  api.post("field_api.submit_support", p);
export const getMySupport = () => api.get("field_api.my_support") as Promise<any[]>;
export const getMobileNotifications = () => api.get("field_api.notifications") as Promise<any[]>;
export const getMyPlots = () => api.get("field_api.my_plots") as Promise<any[]>;
export const getMyTeamMembers = () => api.get("field_api.my_team_members") as Promise<any[]>;
export const updateMyProfile = (phone: string) => api.post("field_api.update_my_profile", { phone });
export const changeMyPassword = (newPassword: string, oldPassword?: string) =>
  api.post("field_api.change_my_password", { new_password: newPassword, old_password: oldPassword });
