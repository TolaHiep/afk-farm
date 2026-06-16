import React from "react";
import { Search, ChevronDown, ChevronRight, Phone, Mail, MapPin, Users, Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import {
  getTeamLeaders, getTeamMembers,
  createTeamLeader, updateTeamLeader, deleteTeamLeader,
  createTeamMember, updateTeamMember, deleteTeamMember,
} from "../../lib/queries";

interface Leader { id: string; name: string; phone: string; email: string; password?: string; plotId: string; plotIds: string[]; status: string; }
interface Member { id: string; name: string; phone: string; teamLeaderId: string; status: string; }

type LeaderModal = { mode: "add" | "edit"; data: Leader } | null;
type MemberModal = { mode: "add" | "edit"; data: Member } | null;
type Confirm =
  | { kind: "leader"; id: string; name: string; memberCount: number }
  | { kind: "member"; id: string; name: string }
  | null;

const emptyLeader = (): Leader => ({ id: "", name: "", phone: "", email: "", password: "", plotId: "", plotIds: [], status: "active" });
const emptyMember = (leaderId: string): Member => ({ id: "", name: "", phone: "", teamLeaderId: leaderId, status: "active" });

export function TeamManagement() {
  const [leaders, setLeaders] = React.useState<Leader[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({});
  const [leaderModal, setLeaderModal] = React.useState<LeaderModal>(null);
  const [memberModal, setMemberModal] = React.useState<MemberModal>(null);
  const [confirm, setConfirm] = React.useState<Confirm>(null);

  const reload = () =>
    Promise.all([getTeamLeaders(), getTeamMembers()]).then(([l, m]) => {
      setLeaders(l);
      setMembers(m);
    });

  React.useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải…</div>;

  const q = query.trim().toLowerCase();
  const filteredLeaders = leaders.filter((l) =>
    !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.phone.toLowerCase().includes(q)
  );

  // ===== CRUD tổ trưởng (gọi API thật) =====
  const saveLeader = async (data: Leader) => {
    if (!data.name.trim()) return;
    try {
      if (data.id) {
        await updateTeamLeader(data.id, {
          full_name: data.name, phone: data.phone, status: data.status,
          ...(data.password ? { password: data.password } : {}),
        });
      } else {
        if (!data.email.trim()) { alert("Vui lòng nhập email đăng nhập cho tổ trưởng."); return; }
        await createTeamLeader({
          email: data.email.trim(), full_name: data.name, phone: data.phone,
          password: data.password || undefined, status: data.status,
        });
      }
      await reload();
      setLeaderModal(null);
    } catch (e) {
      alert("Lưu tổ trưởng thất bại: " + (e as Error).message);
    }
  };
  const deleteLeader = async (id: string) => {
    try {
      await deleteTeamLeader(id);
      await reload();
    } catch (e) {
      alert("Ngừng hoạt động tổ trưởng thất bại: " + (e as Error).message);
    }
    setConfirm(null);
  };

  // ===== CRUD tổ viên (gọi API thật) =====
  const saveMember = async (data: Member) => {
    if (!data.name.trim()) return;
    try {
      if (data.id) {
        await updateTeamMember(data.id, {
          member_name: data.name, phone: data.phone,
          team_leader: data.teamLeaderId, status: data.status,
        });
      } else {
        await createTeamMember({
          member_name: data.name, team_leader: data.teamLeaderId || undefined,
          phone: data.phone, status: data.status,
        });
      }
      await reload();
      setMemberModal(null);
    } catch (e) {
      alert("Lưu tổ viên thất bại: " + (e as Error).message);
    }
  };
  const deleteMember = async (id: string) => {
    try {
      await deleteTeamMember(id);
      await reload();
    } catch (e) {
      alert("Xóa tổ viên thất bại: " + (e as Error).message);
    }
    setConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Search + Add leader */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tổ trưởng theo tên, email hoặc số điện thoại..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <Button variant="primary" onClick={() => setLeaderModal({ mode: "add", data: emptyLeader() })}>
          <Plus className="w-4 h-4 mr-2" /> Thêm tổ trưởng
        </Button>
      </div>

      {/* Accordion list */}
      <div className="space-y-4">
        {filteredLeaders.length === 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-400">
            Không tìm thấy tổ trưởng phù hợp.
          </div>
        )}

        {filteredLeaders.map((leader) => {
          const isOpen = !!openIds[leader.id];
          const myMembers = members.filter((m) => m.teamLeaderId === leader.id);
          const myPlots = leader.plotIds ?? [];

          return (
            <div key={leader.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {/* Leader header */}
              <div className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                <button onClick={() => toggle(leader.id)} className="flex items-start gap-3 min-w-0 text-left flex-1">
                  <span className="mt-1 text-gray-400">
                    {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{leader.name}</span>
                      <StatusBadge status={leader.status === "active" ? "active" : "pending"}>
                        {leader.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </StatusBadge>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3.5 h-3.5" /> {myMembers.length} tổ viên
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 flex-wrap text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1"><Phone className="w-4 h-4 text-gray-400" /> {leader.phone || "—"}</span>
                      <span className="inline-flex items-center gap-1"><Mail className="w-4 h-4 text-gray-400" /> {leader.email || "—"}</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setLeaderModal({ mode: "edit", data: { ...leader } })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Pencil className="w-4 h-4" /> Sửa
                  </button>
                  <button onClick={() => setConfirm({ kind: "leader", id: leader.id, name: leader.name, memberCount: myMembers.length })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                </div>
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div className="border-t border-gray-200 px-5 py-4 space-y-5 bg-gray-50">
                  {/* Plots in charge */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> Lô phụ trách
                    </h4>
                    {myPlots.length === 0 ? (
                      <p className="text-sm text-gray-400">Chưa được giao lô</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {myPlots.map((plotId) => (
                          <span key={plotId} className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700">
                            {plotId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Members */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                        <Users className="w-4 h-4" /> Tổ viên ({myMembers.length})
                      </h4>
                      <button onClick={() => setMemberModal({ mode: "add", data: emptyMember(leader.id) })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 rounded-lg">
                        <UserPlus className="w-4 h-4" /> Thêm tổ viên
                      </button>
                    </div>
                    {myMembers.length === 0 ? (
                      <p className="text-sm text-gray-400">Tổ chưa có tổ viên</p>
                    ) : (
                      <div className="space-y-2">
                        {myMembers.map((m) => (
                          <div key={m.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900">{m.name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-gray-400" /> {m.phone || "—"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge status={m.status === "active" ? "active" : "pending"}>
                                {m.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
                              </StatusBadge>
                              <button onClick={() => setMemberModal({ mode: "edit", data: { ...m } })}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Sửa">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setConfirm({ kind: "member", id: m.id, name: m.name })}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Xóa">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leader modal */}
      {leaderModal && (
        <LeaderForm
          modal={leaderModal}
          onClose={() => setLeaderModal(null)}
          onSave={saveLeader}
        />
      )}

      {/* Member modal */}
      {memberModal && (
        <MemberForm
          modal={memberModal}
          leaders={leaders}
          onClose={() => setMemberModal(null)}
          onSave={saveMember}
        />
      )}

      {/* Confirm delete */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirm.kind === "leader" ? `Ngừng hoạt động tổ trưởng "${confirm.name}"?` : `Xóa tổ viên "${confirm.name}"?`}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirm.kind === "leader"
                ? `Tài khoản sẽ bị vô hiệu hóa (không đăng nhập được) và các công việc tương lai được gán lại tự động. Dữ liệu lịch sử vẫn được giữ.`
                : "Bạn có chắc chắn muốn xóa tổ viên này không?"}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirm(null)}>Hủy</Button>
              <Button variant="danger" onClick={() => (confirm.kind === "leader" ? deleteLeader(confirm.id) : deleteMember(confirm.id))}>
                <Trash2 className="w-4 h-4 mr-2" /> Xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Form tổ trưởng =====
function LeaderForm({ modal, onClose, onSave }: { modal: { mode: "add" | "edit"; data: Leader }; onClose: () => void; onSave: (d: Leader) => void; }) {
  const [form, setForm] = React.useState<Leader>(modal.data);
  const set = (k: keyof Leader, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal title={modal.mode === "add" ? "Thêm tổ trưởng" : "Sửa tổ trưởng"} onClose={onClose}>
      <Field label="Họ tên *">
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nguyễn Văn A"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </Field>
      <Field label="Số điện thoại">
        <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0901234567"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </Field>
      <Field label={modal.mode === "add" ? "Email đăng nhập *" : "Email đăng nhập"}>
        <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="vana@nongtrai.vn"
          readOnly={modal.mode === "edit"}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${modal.mode === "edit" ? "bg-gray-100 text-gray-500" : ""}`} />
        {modal.mode === "edit" && <p className="text-xs text-gray-400 mt-1">Email là tài khoản đăng nhập, không thể đổi.</p>}
      </Field>
      <Field label={modal.mode === "add" ? "Mật khẩu" : "Đặt lại mật khẩu (để trống nếu giữ nguyên)"}>
        <input type="password" value={form.password ?? ""} onChange={(e) => set("password", e.target.value)}
          placeholder={modal.mode === "add" ? "Để trống sẽ tự sinh mật khẩu" : "••••••••"}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </Field>
      <Field label="Trạng thái">
        <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>
      </Field>
      <FormActions onClose={onClose} onSave={() => onSave(form)} disabled={!form.name.trim() || (modal.mode === "add" && !form.email.trim())} />
    </Modal>
  );
}

// ===== Form tổ viên =====
function MemberForm({ modal, leaders, onClose, onSave }: { modal: { mode: "add" | "edit"; data: Member }; leaders: Leader[]; onClose: () => void; onSave: (d: Member) => void; }) {
  const [form, setForm] = React.useState<Member>(modal.data);
  const set = (k: keyof Member, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal title={modal.mode === "add" ? "Thêm tổ viên" : "Sửa tổ viên"} onClose={onClose}>
      <Field label="Họ tên *">
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nguyễn Văn G"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </Field>
      <Field label="Số điện thoại">
        <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0907890123"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </Field>
      <Field label="Thuộc tổ trưởng">
        <select value={form.teamLeaderId} onChange={(e) => set("teamLeaderId", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
          {leaders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>
      <Field label="Trạng thái">
        <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>
      </Field>
      <FormActions onClose={onClose} onSave={() => onSave(form)} disabled={!form.name.trim()} />
    </Modal>
  );
}

// ===== UI helpers =====
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function FormActions({ onClose, onSave, disabled }: { onClose: () => void; onSave: () => void; disabled: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Button variant="secondary" onClick={onClose}>Hủy</Button>
      <Button variant="primary" onClick={onSave} disabled={disabled}>Lưu</Button>
    </div>
  );
}
