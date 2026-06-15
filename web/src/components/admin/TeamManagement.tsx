import React from "react";
import { Search, ChevronDown, ChevronRight, Phone, Mail, MapPin, Users } from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import { teamLeaders, teamMembers, leaderPlots, zoneName } from "../../lib/mockData";

export function TeamManagement() {
  const [query, setQuery] = React.useState("");
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const q = query.trim().toLowerCase();
  const filteredLeaders = teamLeaders.filter((l) => {
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tổ trưởng theo tên, email hoặc số điện thoại..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-96 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
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
          const members = teamMembers.filter((m) => m.teamLeaderId === leader.id);
          const myPlots = leaderPlots(leader.id);

          return (
            <div
              key={leader.id}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
            >
              {/* Leader header (clickable) */}
              <button
                onClick={() => toggle(leader.id)}
                className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-1 text-gray-400">
                    {isOpen ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{leader.name}</span>
                      <StatusBadge status={leader.status === "active" ? "active" : "pending"}>
                        {leader.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </StatusBadge>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3.5 h-3.5" /> {members.length} tổ viên
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 flex-wrap text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-400" /> {leader.phone}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-4 h-4 text-gray-400" /> {leader.email}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

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
                        {myPlots.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700"
                          >
                            {zoneName(p.zoneId)} · {p.name} ({p.crop})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Members */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
                      <Users className="w-4 h-4" /> Tổ viên ({members.length})
                    </h4>
                    {members.length === 0 ? (
                      <p className="text-sm text-gray-400">Tổ chưa có tổ viên</p>
                    ) : (
                      <div className="space-y-2">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900">{m.name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-gray-400" /> {m.phone}
                              </div>
                            </div>
                            <StatusBadge status={m.status === "active" ? "active" : "pending"}>
                              {m.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
                            </StatusBadge>
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
    </div>
  );
}
