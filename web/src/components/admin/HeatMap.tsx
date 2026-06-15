import React from "react";
import { Filter, Calendar, MapPin } from "lucide-react";
import { Button } from "../ui/button";
import { plots, tasks, anomalies, zoneName } from "../../lib/mockData";

export function HeatMap() {
  const [selectedPlot, setSelectedPlot] = React.useState<string | null>(null);
  const [filterDate, setFilterDate] = React.useState("2026-06-14");
  const [filterZone, setFilterZone] = React.useState("Tất cả vùng");
  const [filterCrop, setFilterCrop] = React.useState("Tất cả cây");

  const selectedPlotData = plots.find((p) => p.id === selectedPlot);

  // Công việc của lô đang chọn theo ngày đã lọc
  const plotTasks = tasks.filter(
    (t) => t.plotId === selectedPlot && t.date === filterDate
  );

  // Chia nhóm theo trạng thái
  const completedTasks = plotTasks.filter((t) => t.status === "completed");
  const inProgressTasks = plotTasks.filter((t) => t.status === "in-progress");
  const pendingTasks = plotTasks.filter((t) => t.status === "pending");
  const overdueTasks = plotTasks.filter((t) => t.status === "overdue");

  // Bất thường/phát sinh của lô
  const plotAnomalies = anomalies.filter((a) => a.plotId === selectedPlot);

  const getPlotColor = (status: string) => {
    switch (status) {
      case "good":
        return "#16a34a";
      case "warning":
        return "#eab308";
      case "danger":
        return "#dc2626";
      default:
        return "#9ca3af";
    }
  };

  // Một nhóm công việc trong panel
  const TaskGroup = ({
    title,
    items,
    dotCls,
    titleCls,
  }: {
    title: string;
    items: { id: string; title: string }[];
    dotCls: string;
    titleCls: string;
  }) => (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2.5 h-2.5 rounded-full ${dotCls}`}></span>
        <span className={`text-sm font-medium ${titleCls}`}>
          {title} ({items.length})
        </span>
      </div>
      {items.length > 0 ? (
        <ul className="ml-5 space-y-1">
          {items.map((it) => (
            <li key={it.id} className="text-sm text-gray-700 list-disc">
              {it.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ml-5 text-xs text-gray-400">—</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option>Tất cả vùng</option>
              <option>Vùng A</option>
              <option>Vùng B</option>
              <option>Vùng C</option>
              <option>Vùng D</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-500" />
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option>Tất cả cây</option>
              <option>Gấc</option>
              <option>Sâm</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heat Map */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Bản đồ nhiệt vùng trồng
          </h3>

          {/* Simple map visualization */}
          <div className="relative w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              className="absolute inset-0"
            >
              {plots.map((plot) => {
                const coords = plot.coordinates as number[][];
                const points = coords
                  .map((c) => `${c[0] * 100},${c[1] * 100}`)
                  .join(" ");
                return (
                  <polygon
                    key={plot.id}
                    points={points}
                    fill={getPlotColor(plot.status)}
                    stroke={selectedPlot === plot.id ? "#111827" : "white"}
                    strokeWidth={selectedPlot === plot.id ? "1" : "0.5"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedPlot(plot.id)}
                  />
                );
              })}
            </svg>

            {/* Plot Labels */}
            {plots.map((plot) => {
              const coords = plot.coordinates as number[][];
              const centerX =
                (coords.reduce((sum, c) => sum + c[0], 0) / coords.length) * 100;
              const centerY =
                (coords.reduce((sum, c) => sum + c[1], 0) / coords.length) * 100;
              return (
                <div
                  key={`label-${plot.id}`}
                  className="absolute text-xs font-semibold text-white pointer-events-none"
                  style={{
                    left: `${centerX}%`,
                    top: `${centerY}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {plot.name}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-600">Bình thường</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">Cảnh báo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-sm text-gray-600">Bất thường</span>
            </div>
          </div>
        </div>

        {/* Plot Details Panel */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          {selectedPlotData ? (
            <div className="space-y-4">
              {/* Header lô */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedPlotData.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {zoneName(selectedPlotData.zoneId)} · {selectedPlotData.crop}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổ trưởng:</span>
                  <span className="font-medium">
                    {selectedPlotData.teamLeader}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiến độ:</span>
                  <span className="font-medium">
                    {selectedPlotData.done}/{selectedPlotData.total} việc
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Diện tích:</span>
                  <span className="font-medium">
                    {selectedPlotData.area.toLocaleString()} m²
                  </span>
                </div>
              </div>

              {/* Công việc theo ngày, chia nhóm */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">
                  Công việc ngày {filterDate}
                </h4>
                {plotTasks.length > 0 ? (
                  <div className="space-y-3">
                    <TaskGroup
                      title="Đã hoàn thành"
                      items={completedTasks}
                      dotCls="bg-green-500"
                      titleCls="text-green-700"
                    />
                    <TaskGroup
                      title="Đang làm"
                      items={inProgressTasks}
                      dotCls="bg-blue-500"
                      titleCls="text-blue-700"
                    />
                    <TaskGroup
                      title="Chưa làm"
                      items={pendingTasks}
                      dotCls="bg-gray-400"
                      titleCls="text-gray-600"
                    />
                    <TaskGroup
                      title="Quá hạn"
                      items={overdueTasks}
                      dotCls="bg-red-500"
                      titleCls="text-red-700"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Không có công việc</p>
                )}
              </div>

              {/* Bất thường / phát sinh từ anomalies */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">
                  Bất thường / phát sinh ({plotAnomalies.length})
                </h4>
                {plotAnomalies.length > 0 ? (
                  <ul className="space-y-2">
                    {plotAnomalies.map((a) => (
                      <li
                        key={a.id}
                        className={`p-2 rounded text-sm ${
                          a.status === "resolved"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <div className="font-medium">{a.type}</div>
                        <div className="text-xs opacity-80">{a.description}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Không có bất thường</p>
                )}
              </div>

              <Button variant="primary" className="w-full">
                Xem lịch công việc
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Chọn một lô trên bản đồ</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
