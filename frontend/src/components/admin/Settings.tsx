import React from "react";
import { Settings as SettingsIcon, Mail, Building2, Send } from "lucide-react";
import { getSettings, saveSettings, uploadLogo, sendTestEmail, sendDailyNotifications } from "../../lib/queries";
import { notifyAppSettingsChanged } from "../../lib/useAppSettings";
import { toast } from "../../lib/toast";

type SettingsState = {
  appName: string;
  appSubtitleAdmin: string;
  appSubtitleMobile: string;
  companyName: string;
  contact: string;
  logoText: string;
  logoUrl: string;
  smtpHost: string;
  smtpPort: string;
  fromEmail: string;
  fromName: string;
  smtpPassword: string;
  emailEnabled: boolean;
};

const EMPTY: SettingsState = {
  appName: "",
  appSubtitleAdmin: "",
  appSubtitleMobile: "",
  companyName: "",
  contact: "",
  logoText: "",
  logoUrl: "",
  smtpHost: "",
  smtpPort: "",
  fromEmail: "",
  fromName: "",
  smtpPassword: "",
  emailEnabled: false,
};

function Field({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
    </div>
  );
}

export function Settings() {
  const [tab, setTab] = React.useState<"app" | "email">("app");
  const [data, setData] = React.useState<SettingsState>(EMPTY);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    getSettings()
      .then((s: any) => {
        if (!alive) return;
        setData({
          appName: s?.appName ?? "",
          appSubtitleAdmin: s?.appSubtitleAdmin ?? "",
          appSubtitleMobile: s?.appSubtitleMobile ?? "",
          companyName: s?.companyName ?? "",
          contact: s?.contact ?? "",
          logoText: s?.logoText ?? "",
          logoUrl: s?.logoUrl ?? "",
          smtpHost: s?.smtpHost ?? "",
          smtpPort: s?.smtpPort != null ? String(s.smtpPort) : "",
          fromEmail: s?.fromEmail ?? "",
          fromName: s?.fromName ?? "",
          smtpPassword: "",
          emailEnabled: !!s?.emailEnabled,
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const logoInputRef = React.useRef<HTMLInputElement>(null);

  if (loading) {
    return <div className="text-sm text-gray-500 p-6">Đang tải cài đặt…</div>;
  }

  const save = (msg: string) => {
    saveSettings(data).then(() => { notifyAppSettingsChanged(); toast.success(msg); })
      .catch((e: any) => toast.error(e?.message || "Lưu cài đặt thất bại. Vui lòng thử lại."));
  };

  const onLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const r = await uploadLogo(dataUrl);
      setData((d) => ({ ...d, logoUrl: r.logoUrl }));
      notifyAppSettingsChanged();
      toast.success("Đã tải logo lên.");
    } catch (err: any) {
      toast.error(err?.message || "Tải logo thất bại. Vui lòng thử lại.");
    }
  };

  const onTestEmail = async () => {
    try {
      const r = await sendTestEmail();
      if (r.ok) toast.success("Đã gửi email thử nghiệm.");
      else toast.error(r.reason || "Gửi email thất bại. Vui lòng kiểm tra cấu hình SMTP.");
    } catch (err: any) {
      toast.error(err?.message || "Gửi email thất bại. Vui lòng thử lại.");
    }
  };

  const onSendNotifications = async () => {
    try {
      const r = await sendDailyNotifications();
      const summary = `Tổng hợp: ${r.overdue} việc quá hạn, ${r.anomalies} bất thường mới.`;
      if (r.sent) toast.success(`${summary}\nĐã gửi email cho ${r.sent} admin.`);
      else toast.warning(`${summary}\n${r.reason || "Chưa gửi được email (kiểm tra cấu hình/Bật gửi email)."}`);
    } catch (err: any) {
      toast.error(err?.message || "Gửi thông báo thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-green-600" /> Cài đặt hệ thống
        </h2>
        <p className="text-sm text-gray-500">Thông tin phần mềm và cấu hình gửi email</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("app")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${tab === "app" ? "bg-green-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
          <Building2 className="w-4 h-4" /> Phần mềm
        </button>
        <button onClick={() => setTab("email")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${tab === "email" ? "bg-green-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
          <Mail className="w-4 h-4" /> Email (SMTP)
        </button>
      </div>

      {tab === "app" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <Field label="Tên phần mềm" value={data.appName} onChange={(v) => setData({ ...data, appName: v })} />
          <Field label="Phụ đề trang đăng nhập admin" value={data.appSubtitleAdmin}
            onChange={(v) => setData({ ...data, appSubtitleAdmin: v })} />
          <Field label="Phụ đề trang đăng nhập mobile" value={data.appSubtitleMobile}
            onChange={(v) => setData({ ...data, appSubtitleMobile: v })} />
          <Field label="Tên trang trại / công ty" value={data.companyName} onChange={(v) => setData({ ...data, companyName: v })} />
          <Field label="Thông tin liên hệ" value={data.contact} onChange={(v) => setData({ ...data, contact: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
            <div className="flex items-center gap-3">
              {data.logoUrl ? (
                <img src={data.logoUrl} alt="logo" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-green-600 text-white grid place-items-center font-bold">{data.logoText}</div>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={onLogoPick} />
              <button onClick={() => logoInputRef.current?.click()} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Tải logo lên</button>
            </div>
          </div>
          <button onClick={() => save("Đã lưu cài đặt phần mềm")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Lưu thay đổi</button>
        </div>
      )}

      {tab === "email" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="SMTP host" value={data.smtpHost} onChange={(v) => setData({ ...data, smtpHost: v })} placeholder="smtp.gmail.com" />
            <Field label="SMTP port" value={data.smtpPort} onChange={(v) => setData({ ...data, smtpPort: v })} placeholder="587" />
            <Field label="Email gửi" value={data.fromEmail} onChange={(v) => setData({ ...data, fromEmail: v })} type="email" />
            <Field label="Tên người gửi" value={data.fromName} onChange={(v) => setData({ ...data, fromName: v })} />
            <Field label="Mật khẩu / App password" value={data.smtpPassword} onChange={(v) => setData({ ...data, smtpPassword: v })} type="password" placeholder="••••••••" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={data.emailEnabled} onChange={(e) => setData({ ...data, emailEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300" />
            Bật gửi email
          </label>
          <div className="flex gap-2">
            <button onClick={() => save("Đã lưu cấu hình email")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Lưu cấu hình</button>
            <button onClick={onTestEmail}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Send className="w-4 h-4" /> Gửi email test
            </button>
            <button onClick={onSendNotifications}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Mail className="w-4 h-4" /> Gửi thông báo tổng hợp
            </button>
          </div>
          <p className="text-xs text-gray-500">Hệ thống tự gửi email tổng hợp (việc quá hạn + bất thường mới) cho admin mỗi ngày. Nút trên để gửi ngay.</p>
        </div>
      )}
    </div>
  );
}
