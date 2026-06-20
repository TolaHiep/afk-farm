import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  User,
  Phone,
  Mail,
  Layers,
  Users,
  Save,
  Lock,
  KeyRound,
  LogOut,
  Sprout,
} from "lucide-react";
import { getMyPlots, getMyTeamMembers, updateMyProfile, changeMyPassword } from "../../lib/queries";
import { useAuth } from "../../lib/auth";
import { toast } from "../../lib/toast";

type Plot = { id: string; name: string; zoneId?: string; crops?: string[] };

export function MobileAccount() {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();

  // Dữ liệu thật của tổ trưởng đang đăng nhập
  const [myPlots, setMyPlots] = useState<Plot[]>([]);
  const [memberCount, setMemberCount] = useState(0);

  // Form thông tin liên hệ — phone đọc từ user (auth.me) để giữ lại sau khi điều hướng
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingContact, setSavingContact] = useState(false);

  // Form đổi mật khẩu
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([getMyPlots(), getMyTeamMembers()])
      .then(([plots, members]) => {
        setMyPlots(plots ?? []);
        setMemberCount((members ?? []).length);
      })
      .catch(() => {});
  }, [user]);

  if (!user) {
    return <div className="p-4 text-center text-gray-500">Vui lòng đăng nhập</div>;
  }

  async function handleSaveContact() {
    setSavingContact(true);
    try {
      await updateMyProfile(phone);
      await refresh();
      toast.success("Đã lưu số điện thoại.");
    } catch (e: any) {
      toast.error(e?.message || "Lưu thông tin thất bại. Vui lòng thử lại.");
    } finally {
      setSavingContact(false);
    }
  }

  async function handleChangePassword() {
    if (!curPass || !newPass || !confirmPass) {
      toast.warning("Vui lòng nhập đầy đủ thông tin mật khẩu.");
      return;
    }
    if (newPass !== confirmPass) {
      toast.warning("Mật khẩu nhập lại không khớp.");
      return;
    }
    setSavingPass(true);
    try {
      await changeMyPassword(newPass, curPass);
      toast.success("Đổi mật khẩu thành công.");
      setCurPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (e: any) {
      toast.error(e?.message || "Đổi mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Hồ sơ cá nhân */}
      <div className="bg-white rounded-xl p-5 shadow">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <User className="w-9 h-9 text-green-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {user.full_name}
            </h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Lô phụ trách + số tổ viên */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-medium">Lô phụ trách</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{myPlots.length}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Số tổ viên</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{memberCount}</p>
          </div>
        </div>

        {/* Danh sách lô */}
        <div className="flex flex-wrap gap-2 mt-3">
          {myPlots.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700"
            >
              <Sprout className="w-3.5 h-3.5" />
              {p.name}{p.crops && p.crops.length > 0 ? ` · ${p.crops.join(", ")}` : ""}
            </span>
          ))}
          {myPlots.length === 0 && (
            <span className="text-sm text-gray-400">Chưa được phân lô</span>
          )}
        </div>
      </div>

      {/* Cập nhật thông tin liên hệ */}
      <div className="bg-white rounded-xl p-4 shadow space-y-3">
        <h3 className="text-base font-bold text-gray-900">Thông tin liên hệ</h3>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Số điện thoại
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-green-500">
            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 py-3 outline-none text-gray-900 bg-transparent"
              placeholder="Nhập số điện thoại"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Email
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-green-500">
            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="email"
              value={email}
              readOnly
              className="flex-1 py-3 outline-none text-gray-500 bg-transparent"
              placeholder="Email đăng nhập"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Email đăng nhập do quản trị viên cấp, không thể tự đổi.</p>
        </div>

        <button
          onClick={handleSaveContact}
          disabled={savingContact}
          className="w-full bg-green-600 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-semibold shadow active:bg-green-700 disabled:opacity-60"
        >
          <Save className="w-5 h-5" />
          {savingContact ? "Đang lưu…" : "Lưu"}
        </button>
      </div>

      {/* Đổi mật khẩu */}
      <div className="bg-white rounded-xl p-4 shadow space-y-3">
        <h3 className="text-base font-bold text-gray-900">Đổi mật khẩu</h3>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Mật khẩu hiện tại
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-green-500">
            <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="password"
              value={curPass}
              onChange={(e) => setCurPass(e.target.value)}
              className="flex-1 py-3 outline-none text-gray-900 bg-transparent"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Mật khẩu mới
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-green-500">
            <KeyRound className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="flex-1 py-3 outline-none text-gray-900 bg-transparent"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Nhập lại mật khẩu mới
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-green-500">
            <KeyRound className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="flex-1 py-3 outline-none text-gray-900 bg-transparent"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={savingPass}
          className="w-full bg-blue-600 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-semibold shadow active:bg-blue-700 disabled:opacity-60"
        >
          <KeyRound className="w-5 h-5" />
          {savingPass ? "Đang đổi…" : "Đổi mật khẩu"}
        </button>
      </div>

      {/* Đăng xuất */}
      <button
        onClick={async () => {
          await logout();
          navigate("/mobile/login");
        }}
        className="w-full bg-white border border-red-300 text-red-600 rounded-xl py-3.5 flex items-center justify-center gap-2 font-semibold shadow active:bg-red-50"
      >
        <LogOut className="w-5 h-5" />
        Đăng xuất
      </button>
    </div>
  );
}
