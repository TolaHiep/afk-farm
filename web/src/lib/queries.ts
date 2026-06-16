import { api } from "./api";

export type User = { email: string; full_name: string; role: "admin" | "team_leader"; roles: string[] };

// Auth
export const apiMe = () => api.get("auth_api.me") as Promise<User>;
export const apiLogin = (usr: string, pwd: string) => api.post("auth_api.login", { usr, pwd }) as Promise<User>;
export const apiLogout = () => api.post("auth_api.logout");

// Admin — vùng/lô/bản đồ/lịch
export const getZones = () => api.get("admin_api.list_zones") as Promise<any[]>;
export const getPlots = (zone?: string) =>
  api.get("admin_api.list_plots", zone ? { zone } : undefined) as Promise<any[]>;
export const getHeatmap = () => api.get("admin_api.heatmap") as Promise<{ zones: any[]; plots: any[] }>;
export const getCalendar = (fromDate: string, days = 10) =>
  api.get("admin_api.calendar", { from_date: fromDate, days: String(days) }) as Promise<any[]>;
export const rescheduleTask = (task: string, newDate: string) =>
  api.post("admin_api.reschedule_task", { task, new_date: newDate });
export const reassignTask = (task: string, teamLeader: string) =>
  api.post("admin_api.reassign_task", { task, team_leader: teamLeader });

// Admin — tổ, quy trình, chu kỳ
export const getTeamLeaders = () => api.get("admin_api.list_team_leaders") as Promise<any[]>;
export const getTeamMembers = () => api.get("admin_api.list_team_members") as Promise<any[]>;
export const getProcesses = () => api.get("admin_api.list_processes") as Promise<any[]>;
export const getCropCycles = () => api.get("admin_api.list_crop_cycles") as Promise<any[]>;

// Admin — báo cáo/hỗ trợ/bất thường/thông báo/cài đặt/dashboard
export const getAnomalies = () => api.get("admin_api.list_anomalies") as Promise<any[]>;
export const getReports = () => api.get("admin_api.list_reports") as Promise<any[]>;
export const getSupport = () => api.get("admin_api.list_support") as Promise<any[]>;
export const replySupport = (name: string, reply: string, status = "replied") =>
  api.post("admin_api.reply_support", { name, reply, status });
export const getNotifications = () => api.get("admin_api.list_notifications") as Promise<any[]>;
export const getSettings = () => api.get("admin_api.get_settings") as Promise<any>;
export const saveSettings = (s: Record<string, unknown>) => api.post("admin_api.save_settings", s);
export const getDashboard = (date?: string) =>
  api.get("admin_api.dashboard", date ? { date } : undefined) as Promise<any>;
export const getTeamKpi = () => api.get("admin_api.team_kpi") as Promise<any[]>;

// Field (mobile)
export const getTodayTasks = (date?: string) =>
  api.get("field_api.today_tasks", date ? { date } : undefined) as Promise<any[]>;
export const getUpcomingTasks = (fromDate?: string, days = 10) =>
  api.get("field_api.upcoming_tasks", fromDate ? { from_date: fromDate, days: String(days) } : undefined) as Promise<any[]>;
export const getTaskDetail = (task: string) => api.get("field_api.task_detail", { task }) as Promise<any>;
export const completeTask = (task: string, clientUuid?: string, photos?: string[]) =>
  api.post("field_api.complete_task", { task, client_uuid: clientUuid, photos });
export const submitReport = (p: { block: string; crop: string; date: string; content: string; photos?: string[]; abnormal?: number; client_uuid?: string }) =>
  api.post("field_api.submit_report", p);
export const getMyReports = () => api.get("field_api.my_reports") as Promise<any[]>;
export const submitSupport = (p: { block: string; type: string; content: string; photos?: string[] }) =>
  api.post("field_api.submit_support", p);
export const getMySupport = () => api.get("field_api.my_support") as Promise<any[]>;
export const getMobileNotifications = () => api.get("field_api.notifications") as Promise<any[]>;
