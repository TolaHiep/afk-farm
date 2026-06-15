import React from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Camera, CheckCircle, Send, HelpCircle, MessageSquare } from "lucide-react";
import { supportRequests, supportTypes, leaderPlots, plotName } from "../../lib/mockData";

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
  const myPlots = leaderPlots("tl1");

  const [plotId, setPlotId] = React.useState(myPlots[0]?.id ?? "");
  const [type, setType] = React.useState(supportTypes[0] ?? "");
  const [content, setContent] = React.useState("");
  const [hasPhoto, setHasPhoto] = React.useState(false);
  const [localRequests, setLocalRequests] = React.useState<SupportRequest[]>([]);

  const myRequests: SupportRequest[] = [
    ...localRequests,
    ...supportRequests.filter((s) => s.teamLeaderId === "tl1"),
  ];

  const handleSubmit = (e: React.FormEvent) => {
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

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const sentAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newReq: SupportRequest = {
      id: `sr-local-${Date.now()}`,
      teamLeaderId: "tl1",
      reporter: "Nguyễn Văn A",
      plotId,
      type,
      content: content.trim(),
      photos: hasPhoto ? ["https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400"] : [],
      sentAt,
      status: "pending",
      reply: "",
    };

    setLocalRequests((prev) => [newReq, ...prev]);
    setContent("");
    setHasPhoto(false);
    alert("(Demo) Đã gửi yêu cầu hỗ trợ");
  };

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
              onClick={() => setHasPhoto(!hasPhoto)}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                hasPhoto
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {hasPhoto ? <CheckCircle className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                {hasPhoto ? "Đã chụp ảnh" : "Chụp ảnh"}
              </span>
            </button>
          </div>

          {/* Nút gửi */}
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Gửi yêu cầu
          </button>
        </form>

        {/* DANH SÁCH ĐÃ GỬI (4.4.2) */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 text-lg px-1">Yêu cầu đã gửi</h2>

          {myRequests.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
              Chưa có yêu cầu nào.
            </div>
          )}

          {myRequests.map((req) => {
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
          })}
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
