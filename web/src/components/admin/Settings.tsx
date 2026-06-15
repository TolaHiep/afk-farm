import React from "react";
import { Settings as SettingsIcon, Mail, Building2, Send } from "lucide-react";
import { appSettings, emailSettings } from "../../lib/mockData";

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
  const [app, setApp] = React.useState(appSettings);
  const [mail, setMail] = React.useState(emailSettings);

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
          <Field label="Tên phần mềm" value={app.appName} onChange={(v) => setApp({ ...app, appName: v })} />
          <Field label="Tên trang trại / công ty" value={app.companyName} onChange={(v) => setApp({ ...app, companyName: v })} />
          <Field label="Thông tin liên hệ" value={app.contact} onChange={(v) => setApp({ ...app, contact: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-600 text-white grid place-items-center font-bold">{app.logoText}</div>
              <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Tải logo lên</button>
            </div>
          </div>
          <button onClick={() => alert("(Demo) Đã lưu cài đặt phần mềm")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Lưu thay đổi</button>
        </div>
      )}

      {tab === "email" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="SMTP host" value={mail.smtpHost} onChange={(v) => setMail({ ...mail, smtpHost: v })} placeholder="smtp.gmail.com" />
            <Field label="SMTP port" value={mail.smtpPort} onChange={(v) => setMail({ ...mail, smtpPort: v })} placeholder="587" />
            <Field label="Email gửi" value={mail.fromEmail} onChange={(v) => setMail({ ...mail, fromEmail: v })} type="email" />
            <Field label="Tên người gửi" value={mail.fromName} onChange={(v) => setMail({ ...mail, fromName: v })} />
            <Field label="Mật khẩu / App password" value={""} onChange={() => {}} type="password" placeholder="••••••••" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={mail.enabled} onChange={(e) => setMail({ ...mail, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300" />
            Bật gửi email
          </label>
          <div className="flex gap-2">
            <button onClick={() => alert("(Demo) Đã lưu cấu hình email")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Lưu cấu hình</button>
            <button onClick={() => alert("(Demo) Đã gửi email thử nghiệm")}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Send className="w-4 h-4" /> Gửi email test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
