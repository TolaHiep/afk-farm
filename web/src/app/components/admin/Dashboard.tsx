import React from "react";
import { CheckCircle, AlertCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { KPICard } from "../ui/KPICard";
import { StatusBadge } from "../ui/StatusBadge";
import { tasks, anomalies, plots } from "../../lib/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function Dashboard() {
  const today = tasks.filter(t => t.date === "2026-06-14");
  const completedToday = today.filter(t => t.status === "completed").length;
  const overdueCount = tasks.filter(t => t.status === "overdue").length;
  const warningPlots = plots.filter(p => p.status === "warning" || p.status === "danger").length;
  const newAnomalies = anomalies.filter(a => a.status === "pending").length;

  const chartData = [
    { name: "Vùng A", tasks: 8, completed: 6 },
    { name: "Vùng B", tasks: 7, completed: 4 },
    { name: "Vùng C", tasks: 6, completed: 5 },
    { name: "Vùng D", tasks: 5, completed: 2 },
  ];

  const needAttention = [
    { plot: "Lô B1", issue: "Công việc quá hạn", status: "danger" as const },
    { plot: "Lô D1", issue: "Giàn đỡ hỏng", status: "warning" as const },
    { plot: "Lô B1", issue: "Phát hiện sâu bệnh", status: "danger" as const },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Hoàn thành hôm nay"
          value={`${Math.round((completedToday / today.length) * 100)}%`}
          icon={CheckCircle}
          trend={`${completedToday}/${today.length} công việc`}
          color="green"
        />
        <KPICard
          title="Việc quá hạn"
          value={overdueCount}
          icon={AlertCircle}
          trend="Cần xử lý ngay"
          color="red"
        />
        <KPICard
          title="Vùng cảnh báo"
          value={warningPlots}
          icon={AlertTriangle}
          trend="Vàng/Đỏ"
          color="yellow"
        />
        <KPICard
          title="Bất thường mới"
          value={newAnomalies}
          icon={TrendingUp}
          trend="Hôm nay"
          color="blue"
        />
      </div>

      {/* Charts and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Công việc theo vùng</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tasks" name="Tổng việc" fill="#9ca3af" />
              <Bar dataKey="completed" name="Hoàn thành" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Need Attention */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cần chú ý</h3>
          <div className="space-y-3">
            {needAttention.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{item.plot}</span>
                  <StatusBadge status={item.status}>
                    {item.status === "danger" ? "Khẩn" : "Cảnh báo"}
                  </StatusBadge>
                </div>
                <p className="text-sm text-gray-600">{item.issue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Công việc hôm nay</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Công việc</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lô</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cây</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổ trưởng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {today.map((task) => {
                const plot = plots.find(p => p.id === task.plotId);
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{plot?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{task.crop}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{plot?.teamLeader}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status}>
                        {task.status === "completed" ? "Xong" : 
                         task.status === "in-progress" ? "Đang làm" :
                         task.status === "overdue" ? "Quá hạn" : "Chưa làm"}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
