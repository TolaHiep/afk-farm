import React from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Camera, Send, HelpCircle, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { supportTypes } from "../../lib/mockData";
import { submitSupport, getMySupport, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid, currentQueueBytes, withinBudget, OFFLINE_BUDGET } from "../../lib/offline";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { compressImage, dataUrlBytes, ONLINE, OFFLINE } from "../../lib/image";

type SupportRequest = {
  id: string;
  teamLeaderId: string;
  reporter: string;
  plotId: string;
  type: string;
  content: string;
  photos: string[];
  sentAt: string;
  status: string;
  reply: string;
};

export function MobileSupport() {
  const navigate = useNavigate();
  const [myPlots, setMyPlots] = React.useState<any[]>([]);
  const [plotId, setPlotId] = React.useState("");
  const [type, setType] = React.useState(supportTypes[0] ?? "");
  const [content, setContent] = React.useState("");
  const picker = usePhotoPicker();
  const [myRequests, setMyRequests] = React.useState<SupportRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getMySupport();
      setMyRequests(data);
    } catch (err) {
      console.error("Failed to load support requests:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const loadPlots = async () => {
      try {
        const plots = await getMyPlots();
        setMyPlots(plots);
        if (plots.length > 0 && !plotId) {
          setPlotId(plots[0].id);
        }
      } catch (err) {
        console.error("Failed to load my plots:", err);
      }
    };
    loadPlots();
    loadRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotId) {
      alert("Vui lòng chọn lô!");
      return;
    }
    if (!type) {
      alert("Vui lòng chọn loại hỗ trợ!");
      return;
    }
    if (!content.trim()) {
      alert("Vui lòng nhập nội dung yêu cầu!");
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    const base = { block: plotId, type, content: content.trim() };
    try {
      const photos = await Promise.all(picker.files.map((f) => compressImage(f, ONLINE.maxDim, ONLINE.quality)));
      await submitSupport({ ...base, photos });
      setContent("");
      picker.clear();
      alert("Đã gửi yêu cầu hỗ trợ");
      await loadRequests();
    } catch (err) {
      if (isNetworkError(err)) {
        const small = await Promise.all(picker.files.map((f) => compressImage(f, OFFLINE.maxDim, OFFLINE.quality)));
        const adding = small.reduce((s, d) => s + dataUrlBytes(d), 0);
        if (!withinBudget(currentQueueBytes(), adding, OFFLINE_BUDGET)) {
          alert("Bộ nhớ offline gần đầy. Hãy bớt ảnh hoặc thử lại khi có mạng.");
          return;
        }
        enqueueOffline({
          id: uid(), kind: "support", payload: { ...base, photos: small },
          title: `${plotName(plotId)} · ${type}`,
          date: new Date().toISOString(),
        });
        setContent("");
        picker.clear();
        alert("Mất mạng — đã lưu tạm, sẽ tự gửi khi có mạng (xem màn Đồng bộ).");
      } else {
        console.error("Failed to submit support request:", err);
        alert("Gửi yêu cầu thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Tra tên lô thật theo plotId từ danh sách lô đã nạp, fallback hiển thị chính plotId
  const plotName = (plotId: string) =>
    myPlots.find((p) => p.id === plotId)?.name || plotId;

  const statusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Chờ xử lý", cls: "bg-yellow-100 text-yellow-800" };
      case "approved":
        return { label: "Đã duyệt", cls: "bg-blue-100 text-blue-800" };
      case "rejected":
        return { label: "Từ chối", cls: "bg-red-100 text-red-800" };
      case "replied":
        return { label: "Đã phản hồi", cls: "bg-blue-100 text-blue-800" };
      case "done":
        return { label: "Hoàn tất", cls: "bg-green-100 text-green-800" };
      default:
        return { label: status, cls: "bg-gray-100 text-gray-700" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <button onClick={() => navigate(-1)} className="mb-3">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="w-6 h-6" />
          Yêu cầu hỗ trợ
        </h1>
        <p className="text-green-100 mt-1">Gửi yêu cầu hỗ trợ tới quản lý</p>
      </div>

      <div className="p-4 space-y-4">
        {/* FORM GỬI YÊU CẦU */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 space-y-4">
          <h2 className="font-bold text-gray-900 text-lg">Gửi yêu cầu mới</h2>

          {/* Chọn lô */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Lô liên quan *
            </label>
            <select
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-lg"
            >
              {myPlots.length === 0 && <option value="">Không có lô</option>}
              {myPlots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Loại hỗ trợ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Loại hỗ trợ *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-lg"
            >
              {supportTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nội dung *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg text-base"
              rows={4}
              placeholder="Mô tả chi tiết yêu cầu hỗ trợ..."
            />
          </div>

          {/* Chụp ảnh (tùy chọn) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ảnh đính kèm (tùy chọn)
            </label>
            <button
              type="button"
              onClick={picker.open}
              className="w-full py-3 rounded-lg font-semibold bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200"
            >
              <span className="flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" /> Thêm ảnh
              </span>
            </button>
            <input {...picker.inputProps} />
            {picker.files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {picker.thumbs.map((src, i) => (
                  <div key={src} className="relative">
                    <img src={src} alt="" className="w-full h-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => picker.removeAt(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nút gửi */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </form>

        {/* DANH SÁCH ĐÃ GỬI (4.4.2) */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 text-lg px-1">Yêu cầu đã gửi</h2>

          {loading ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
              Đang tải...
            </div>
          ) : myRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
              Chưa có yêu cầu nào.
            </div>
          ) : (
            myRequests.map((req) => {
              const st = statusInfo(req.status);
              return (
                <div key={req.id} className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm text-gray-500">{req.sentAt}</p>
                      <p className="font-bold text-gray-900">
                        {plotName(req.plotId)}
                        <span className="ml-2 text-sm font-normal text-gray-600">· {req.type}</span>
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>

                  <p className="text-gray-800 text-sm">{req.content}</p>

                  {req.reply && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">Phản hồi từ Admin</span>
                      </div>
                      <p className="text-sm text-blue-900">{req.reply}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quay lại */}
        <Link
          to="/mobile/tasks"
          className="block text-center text-green-700 font-semibold py-2"
        >
          Quay lại danh sách công việc
        </Link>
      </div>
    </div>
  );
}
