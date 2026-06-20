import React from "react";
import { LifeBuoy, Mail, Check, X, MessageSquare, MapPin } from "lucide-react";
import { getSupport, replySupport } from "../../lib/queries";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ xử lý", cls: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Đã duyệt", cls: "bg-blue-100 text-blue-800" },
  rejected: { label: "Từ chối", cls: "bg-red-100 text-red-800" },
  replied: { label: "Đã phản hồi", cls: "bg-blue-100 text-blue-800" },
  done: { label: "Đã hoàn tất", cls: "bg-green-100 text-green-800" },
};

export function SupportRequests() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    getSupport().then((data) => {
      setItems(data);
      setSelected(data[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  const filtered = items.filter((i) => statusFilter === "all" || i.status === statusFilter);
  const current = items.find((i) => i.id === selected);

  const setStatus = (id: string, status: string, replyText?: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status, reply: replyText ?? i.reply } : i)));
  };

  const handleReply = async (id: string, status = "replied") => {
    const text = reply.trim();
    if (!text) {
      alert("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    setSending(true);
    try {
      const res: any = await replySupport(id, text, status);
      setStatus(id, status, text);
      setReply("");
      alert(res?.emailSent
        ? "Đã gửi phản hồi và email cho tổ trưởng."
        : "Đã lưu phản hồi (email chưa gửi — kiểm tra cấu hình email trong Cài đặt).");
    } catch (e) {
      alert("Không gửi được phản hồi. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-lg border border-gray-200">
          Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-green-600" /> Yêu cầu hỗ trợ từ tổ trưởng
          </h2>
          <p className="text-sm text-gray-500">Duyệt, từ chối, phản hồi và gửi email cho tổ trưởng</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.map((i) => (
            <button
              key={i.id}
              onClick={() => { setSelected(i.id); setReply(""); }}
              className={`w-full text-left p-4 bg-white rounded-lg border transition-colors ${
                selected === i.id ? "border-green-500 ring-1 ring-green-500" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{i.reporter}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS[i.status].cls}`}>
                  {STATUS[i.status].label}
                </span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3" /> {i.plotId} · {i.type}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{i.content}</p>
              <div className="text-xs text-gray-400 mt-1">{i.sentAt}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-lg border border-gray-200">
              Không có yêu cầu nào
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {current ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{current.type} — {current.reporter}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {current.plotId} · {current.sentAt}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS[current.status].cls}`}>
                  {STATUS[current.status].label}
                </span>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">{current.content}</div>

              {(current.photos ?? []).length > 0 && (
                <div className="flex gap-3">
                  {(current.photos ?? []).map((src: string, idx: number) => (
                    <img key={idx} src={src} alt="ảnh hỗ trợ" className="w-28 h-28 object-cover rounded-lg border border-gray-200" />
                  ))}
                </div>
              )}

              {current.reply && (
                <div className="p-4 bg-blue-50 rounded-lg text-sm">
                  <div className="font-medium text-blue-800 mb-1">Phản hồi của Admin</div>
                  <p className="text-blue-900">{current.reply}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phản hồi cho tổ trưởng</label>
                <textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Nhập nội dung phản hồi..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleReply(current.id, "approved")}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Duyệt
                </button>
                <button
                  onClick={() => handleReply(current.id, "rejected")}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Từ chối
                </button>
                <button
                  onClick={() => handleReply(current.id, "replied")}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" /> {sending ? "Đang gửi..." : "Gửi phản hồi + email"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400 text-sm">
              Chọn một yêu cầu để xem chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
