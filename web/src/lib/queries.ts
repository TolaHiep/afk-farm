import { api } from "./api";

export type User = { email: string; full_name: string; role: "admin" | "team_leader"; roles: string[] };

export const apiMe = () => api.get("auth_api.me") as Promise<User>;
export const apiLogin = (usr: string, pwd: string) => api.post("auth_api.login", { usr, pwd }) as Promise<User>;
export const apiLogout = () => api.post("auth_api.logout");

export const getZones = () => api.get("admin_api.list_zones") as Promise<any[]>;
export const getPlots = (zone?: string) =>
  api.get("admin_api.list_plots", zone ? { zone } : undefined) as Promise<any[]>;
export const getHeatmap = () => api.get("admin_api.heatmap") as Promise<{ zones: any[]; plots: any[] }>;
