import React from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { teamLeaders, teamMembers, plots } from "../../lib/mockData";

export function TeamManagement() {
  const [activeTab, setActiveTab] = React.useState<"leaders" | "members">("leaders");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("leaders")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "leaders"
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tổ trưởng ({teamLeaders.length})
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "members"
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tổ viên ({teamMembers.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search and Add */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Tìm kiếm ${activeTab === "leaders" ? "tổ trưởng" : "tổ viên"}...`}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-80"
              />
            </div>
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Thêm {activeTab === "leaders" ? "tổ trưởng" : "tổ viên"}
            </Button>
          </div>

          {/* Team Leaders Table */}
          {activeTab === "leaders" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số điện thoại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lô phụ trách</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamLeaders.map((leader) => {
                    const plot = plots.find(p => p.id === leader.plotId);
                    return (
                      <tr key={leader.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{leader.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{leader.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{plot?.name}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={leader.status}>Đang hoạt động</StatusBadge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Team Members Table */}
          {activeTab === "members" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số điện thoại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổ trưởng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => {
                    const leader = teamLeaders.find(l => l.id === member.teamLeaderId);
                    return (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{member.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{leader?.name}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={member.status}>Đang hoạt động</StatusBadge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
