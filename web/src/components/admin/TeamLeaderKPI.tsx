import React from "react";
import { Filter, Download, ClipboardCheck, ClipboardX, AlertTriangle, LifeBuoy } from "lucide-react";
import { Button } from "../ui/button";
import { KPICard } from "../ui/KPICard";
import { StatusBadge } from "../ui/StatusBadge";
import { teamLeaders, teamLeaderReports, supportRequests } from "../../lib/mockData";
import { getTeamKpi } from "../../lib/queries";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const REPORT_DATE = "2026-06-14";

type CropFilter = "all" | "Gấc" | "Sâm";

export function TeamLeaderKPI() {
  // Bộ lọc theo cây (mô hình xen canh: mỗi lô có Gấc + Sâm)
  const [cropFilter, setCropFilter] = React.useState<CropFilter>("all");

  // Dữ liệu KPI lấy từ backend
  const [kpiData, setKpiData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getTeamKpi()
      .then((data) => setKpiData(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Lấy số liệu của 1 tổ theo cây đang chọn: nếu chọn cây thì đọc byCrop, else đọc tổng
  const val = (row: any, field: string): number =>
    cropFilter === "all"
      ? ((row as unknown as Record<string, number>)[field] ?? 0)
      : (row.byCrop?.[cropFilter]?.[field] ?? 0);

  // ===== Thống kê tổng quan báo cáo trong ngày =====
  const activeLeaders = teamLeaders.filter((t) => t.status === "active");
  const totalTeams = activeLeaders.length;

  // Các tổ đã báo cáo trong ngày (distinct teamLeaderId thuộc tổ active)
  const reportedIds = new Set(
    teamLeaderReports
      .filter((r) => r.date === REPORT_DATE && activeLeaders.some((t) => t.id === r.teamLeaderId))
      .map((r) => r.teamLeaderId)
  );
  const reportedCount = reportedIds.size;
  const notReportedCount = Math.max(totalTeams - reportedCount, 0);
  const reportRate = totalTeams ? Math.round((reportedCount / totalTeams) * 100) : 0;

  // Tổ đang gặp vấn đề: có báo cáo bất thường HOẶC có yêu cầu hỗ trợ đang chờ
  const problemIds = new Set<string>();
  teamLeaderReports
    .filter((r) => r.date === REPORT_DATE && r.abnormal)
    .forEach((r) => problemIds.add(r.teamLeaderId));
  supportRequests
    .filter((s) => s.status === "pending")
    .forEach((s) => problemIds.add(s.teamLeaderId));
  const problemCount = problemIds.size;

  // Yêu cầu hỗ trợ
  const supportSent = supportRequests.length;
  const supportHandled = supportRequests.filter((s) =>
    ["approved", "rejected", "replied", "done"].includes(s.status)
  ).length;

  // Map nhanh: tổ nào đã báo cáo trong ngày (dùng cho bảng)
  const reportedSet = reportedIds;

  // ===== Số liệu KPI theo cây đang chọn =====
  const sumOnTime = kpiData.reduce((s, k) => s + val(k, "onTime"), 0);
  const sumCompleted = kpiData.reduce((s, k) => s + val(k, "completed"), 0);

  // Dữ liệu biểu đồ theo cây đang chọn
  const chartData = kpiData.map((k) => ({
    name: k.name,
    onTime: val(k, "onTime"),
    overdue: val(k, "overdue"),
  }));

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Đang tải…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Tất cả tổ trưởng</option>
              {kpiData.map(k => (
                <option key={k.teamLeaderId}>{k.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Cây:</span>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value as CropFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">Tất cả cây</option>
              <option value="Gấc">Gấc (giàn)</option>
              <option value="Sâm">Sâm (dưới tán)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Từ:</span>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" defaultValue="2026-05-01" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Đến:</span>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" defaultValue="2026-06-14" />
          </div>
          <Button variant="secondary" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Tổng quan báo cáo trong ngày */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Tổ đã báo cáo"
          value={`${reportedCount}/${totalTeams}`}
          icon={ClipboardCheck}
          trend={`Tỷ lệ báo cáo: ${reportRate}%`}
          color="green"
        />
        <KPICard
          title="Tổ chưa báo cáo"
          value={notReportedCount}
          icon={ClipboardX}
          trend={`Ngày ${REPORT_DATE.split("-").reverse().join("/")}`}
          color={notReportedCount > 0 ? "yellow" : "green"}
        />
        <KPICard
          title="Tổ đang gặp vấn đề"
          value={problemCount}
          icon={AlertTriangle}
          trend="Có bất thường hoặc yêu cầu hỗ trợ chờ xử lý"
          color={problemCount > 0 ? "red" : "green"}
        />
        <KPICard
          title="Yêu cầu hỗ trợ"
          value={`${supportSent}/${supportHandled}`}
          icon={LifeBuoy}
          trend={`Đã gửi ${supportSent} · Đã xử lý ${supportHandled}`}
          color="blue"
        />
      </div>

      {/* KPI Summary Cards */}
      {cropFilter !== "all" && (
        <div className="text-sm text-gray-600">
          Đang xem số liệu cây: <span className="font-semibold text-green-700">{cropFilter}</span>
          {cropFilter === "Gấc" ? " (tầng giàn)" : " (tầng dưới tán)"}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Đúng hạn</div>
          <div className="text-2xl font-bold text-green-600">
            {Math.round((sumOnTime / Math.max(sumCompleted, 1)) * 100)}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Quá hạn</div>
          <div className="text-2xl font-bold text-red-600">
            {kpiData.reduce((s, k) => s + val(k, "overdue"), 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Hoàn thành</div>
          <div className="text-2xl font-bold text-blue-600">
            {sumCompleted}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Báo cáo đầy đủ</div>
          <div className="text-2xl font-bold text-green-600">
            {Math.round((kpiData.reduce((s, k) => s + val(k, "fullReport"), 0) / Math.max(sumCompleted, 1)) * 100)}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Bất thường</div>
          <div className="text-2xl font-bold text-yellow-600">
            {kpiData.reduce((s, k) => s + val(k, "anomalies"), 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Tổng công</div>
          <div className="text-2xl font-bold text-gray-900">
            {kpiData.reduce((s, k) => s + val(k, "totalWork"), 0)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Biểu đồ KPI theo tổ trưởng{cropFilter !== "all" ? ` · ${cropFilter}` : ""}
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="onTime" name="Đúng hạn" fill="#16a34a" />
            <Bar dataKey="overdue" name="Quá hạn" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Chi tiết KPI</h3>
        </div>
        {/* Bảng đầy đủ: chỉ hiện từ md trở lên */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổ trưởng</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Đã báo cáo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Việc hoàn thành</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Việc chưa hoàn thành</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đúng hạn</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quá hạn</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Báo cáo đầy đủ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bất thường</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng công</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tỷ lệ đúng hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {kpiData.map((kpi) => {
                const completed = val(kpi, "completed");
                const onTime = val(kpi, "onTime");
                const rate = completed ? onTime / completed : 0;
                return (
                <tr key={kpi.teamLeaderId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{kpi.name}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    {reportedSet.has(kpi.teamLeaderId) ? (
                      <StatusBadge status="good">Có</StatusBadge>
                    ) : (
                      <StatusBadge status="danger">Không</StatusBadge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-blue-600 font-medium">{completed}</td>
                  <td className="px-6 py-4 text-sm text-right text-yellow-600 font-medium">{val(kpi, "notDone")}</td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">{onTime}</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600 font-medium">{val(kpi, "overdue")}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">{val(kpi, "fullReport")}</td>
                  <td className="px-6 py-4 text-sm text-right text-yellow-600 font-medium">{val(kpi, "anomalies")}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">{val(kpi, "totalWork")}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={`font-medium ${
                      rate >= 0.9 ? 'text-green-600' :
                      rate >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(rate * 100)}%
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dạng thẻ: chỉ hiện trên điện thoại, xếp dọc, không tràn ngang */}
        <div className="md:hidden divide-y divide-gray-200">
          {kpiData.map((kpi) => {
            const completed = val(kpi, "completed");
            const onTime = val(kpi, "onTime");
            const rate = completed ? onTime / completed : 0;
            return (
              <div key={kpi.teamLeaderId} className="p-4">
                {/* Tên + badge Đã báo cáo */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-semibold text-gray-900">{kpi.name}</div>
                  {reportedSet.has(kpi.teamLeaderId) ? (
                    <StatusBadge status="good">Đã báo cáo</StatusBadge>
                  ) : (
                    <StatusBadge status="danger">Chưa báo cáo</StatusBadge>
                  )}
                </div>

                {/* Lưới 2 cột các chỉ số */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Việc hoàn thành</span>
                    <span className="font-medium text-blue-600">{completed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Việc chưa hoàn thành</span>
                    <span className="font-medium text-yellow-600">{val(kpi, "notDone")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Đúng hạn</span>
                    <span className="font-medium text-green-600">{onTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Quá hạn</span>
                    <span className="font-medium text-red-600">{val(kpi, "overdue")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Báo cáo đầy đủ</span>
                    <span className="font-medium text-gray-900">{val(kpi, "fullReport")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Bất thường</span>
                    <span className="font-medium text-yellow-600">{val(kpi, "anomalies")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Tổng công</span>
                    <span className="font-medium text-gray-900">{val(kpi, "totalWork")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Tỷ lệ đúng hạn</span>
                    <span className={`font-medium ${
                      rate >= 0.9 ? 'text-green-600' :
                      rate >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(rate * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
