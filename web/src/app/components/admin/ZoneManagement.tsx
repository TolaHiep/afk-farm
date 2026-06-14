import React from "react";
import { Link } from "react-router";
import { Plus, Search, Filter, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { zones, plots } from "../../lib/mockData";

export function ZoneManagement() {
  const [expandedZones, setExpandedZones] = React.useState<Set<string>>(new Set(["z1"]));
  const [searchTerm, setSearchTerm] = React.useState("");

  const toggleZone = (zoneId: string) => {
    const newExpanded = new Set(expandedZones);
    if (newExpanded.has(zoneId)) {
      newExpanded.delete(zoneId);
    } else {
      newExpanded.add(zoneId);
    }
    setExpandedZones(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm vùng, lô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>Tất cả trạng thái</option>
            <option>Ổn định</option>
            <option>Cần chú ý</option>
            <option>Bất thường</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/zones/add?type=zone">
            <Button variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Thêm vùng
            </Button>
          </Link>
          <Link to="/admin/zones/add?type=plot">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Thêm lô
            </Button>
          </Link>
        </div>
      </div>

      {/* Zone Tree Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diện tích</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổ trưởng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cây trồng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {zones.map((zone) => {
              const zonePlots = plots.filter(p => p.zoneId === zone.id);
              const isExpanded = expandedZones.has(zone.id);
              
              return (
                <React.Fragment key={zone.id}>
                  {/* Zone Row */}
                  <tr className="bg-gray-50 hover:bg-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleZone(zone.id)}
                          className="mr-2 p-1 hover:bg-gray-200 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        <span className="font-semibold text-gray-900">{zone.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {zone.area.toLocaleString()} m²
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {zone.plots} lô
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">-</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={zone.status}>
                        {zone.status === "good" ? "Ổn định" : "Cần chú ý"}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">Sửa</Button>
                    </td>
                  </tr>

                  {/* Plot Rows */}
                  {isExpanded && zonePlots.map((plot) => (
                    <tr key={plot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 pl-16">
                        <span className="text-gray-900">{plot.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {plot.area.toLocaleString()} m²
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {plot.teamLeader}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {plot.crop}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={plot.status}>
                          {plot.status === "good" ? "Ổn định" :
                           plot.status === "warning" ? "Cần chú ý" : "Bất thường"}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/admin/zones/edit/${plot.id}`}>
                          <Button variant="ghost" size="sm">Sửa</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
