import { useState } from "react";
import {
  FileText,
  Calendar,
  Layers,
  Sprout,
  AlertTriangle,
  MessageSquare,
  ImageIcon,
  Filter,
} from "lucide-react";
import { teamLeaderReports, plotName, leaderPlots } from "../../lib/mockData";

const TEAM_LEADER_ID = "tl1";

// Định dạng ngày kiểu Việt Nam (dd/MM/yyyy)
function formatVNDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function MobileReportHistory() {
  const [plotFilter, setPlotFilter] = useState<string>("all");

  // Các lô do tổ trưởng phụ trách (để làm chip lọc)
  const myPlots = leaderPlots(TEAM_LEADER_ID);

  // Báo cáo của tổ trưởng tl1, sắp theo ngày mới nhất
  const reports = teamLeaderReports
    .filter((r) => r.teamLeaderId === TEAM_LEADER_ID)
    .filter((r) => plotFilter === "all" || r.plotId === plotFilter)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="p-4 space-y-4">
      {/* Tiêu đề */}
      <div className="bg-white rounded-xl p-4 shadow flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Lịch sử báo cáo</h2>
          <p className="text-sm text-gray-600">Các báo cáo bạn đã gửi</p>
        </div>
      </div>

      {/* Bộ lọc theo lô */}
      <div className="bg-white rounded-xl p-3 shadow">
        <div className="flex items-center gap-2 text-gray-500 mb-2 px-1">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-medium">Lọc theo lô</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setPlotFilter("all")}
            className={`flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-full ${
              plotFilter === "all"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 active:bg-gray-200"
            }`}
          >
            Tất cả
          </button>
          {myPlots.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlotFilter(p.id)}
              className={`flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-full ${
                plotFilter === p.id
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 active:bg-gray-200"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách báo cáo */}
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4">
              {/* Hàng đầu: ngày + cờ bất thường */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatVNDate(r.date)}</span>
                </div>
                {r.abnormal && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Bất thường
                  </span>
                )}
              </div>

              {/* Lô + cây */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  <Layers className="w-3.5 h-3.5" />
                  {plotName(r.plotId)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                  <Sprout className="w-3.5 h-3.5" />
                  {r.crop}
                </span>
              </div>

              {/* Nội dung */}
              <p className="text-sm text-gray-800 leading-relaxed">{r.content}</p>

              {/* Ảnh */}
              {r.photos && r.photos.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {r.photos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Ảnh báo cáo ${i + 1}`}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Phản hồi của Admin */}
            {r.reply ? (
              <div className="bg-amber-50 border-t border-amber-100 px-4 py-3">
                <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-semibold">Phản hồi từ quản lý</span>
                </div>
                <p className="text-sm text-amber-900">{r.reply}</p>
              </div>
            ) : (
              <div className="bg-gray-50 border-t border-gray-100 px-4 py-2.5">
                <p className="text-xs text-gray-400">Chưa có phản hồi</p>
              </div>
            )}
          </div>
        ))}

        {reports.length === 0 && (
          <div className="bg-white rounded-xl shadow text-center py-12">
            <ImageIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">Chưa có báo cáo nào</p>
            <p className="text-gray-500 mt-1">Hãy chọn lô khác hoặc gửi báo cáo mới.</p>
          </div>
        )}
      </div>
    </div>
  );
}
