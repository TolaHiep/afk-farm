import { useEffect, useState } from "react";
import { getSettings } from "./queries";

export type AppSettings = { appName: string; logoText: string; logoUrl: string; subtitleAdmin: string; subtitleMobile: string };

const DEFAULTS: AppSettings = {
  appName: "AKF Farm", logoText: "A", logoUrl: "",
  subtitleAdmin: "Hệ thống quản lý sản xuất nông trại",
  subtitleMobile: "Dành cho tổ trưởng",
};
const EVENT = "akf-settings-changed";

let cache: AppSettings | null = null;
let inflight: Promise<AppSettings> | null = null;

async function load(): Promise<AppSettings> {
  if (!inflight) {
    inflight = getSettings()
      .then((s: any) => ({
        appName: s?.appName || DEFAULTS.appName,
        logoText: s?.logoText || DEFAULTS.logoText,
        logoUrl: s?.logoUrl || "",
        subtitleAdmin: s?.appSubtitleAdmin || DEFAULTS.subtitleAdmin,
        subtitleMobile: s?.appSubtitleMobile || DEFAULTS.subtitleMobile,
      }))
      .catch(() => DEFAULTS);
  }
  cache = await inflight;
  return cache;
}

export function notifyAppSettingsChanged() {
  cache = null;
  inflight = null;
  window.dispatchEvent(new Event(EVENT));
}

export function useAppSettings(): AppSettings {
  const [s, setS] = useState<AppSettings>(cache ?? DEFAULTS);
  useEffect(() => {
    let alive = true;
    const refresh = () => load().then((v) => alive && setS(v));
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => { alive = false; window.removeEventListener(EVENT, refresh); };
  }, []);
  return s;
}
