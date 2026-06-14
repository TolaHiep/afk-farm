import React from "react";
import { Plus, Upload, Edit2, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { processes } from "../../lib/mockData";

export function ProcessManagement() {
  const [selectedProcess, setSelectedProcess] = React.useState(processes[0]);

  return (
    <div className="space-y-6">
      {/* Process List */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách quy trình</h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload Excel
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Thêm quy trình
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          {processes.map((process) => (
            <button
              key={process.id}
              onClick={() => setSelectedProcess(process)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedProcess.id === process.id
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {process.name}
            </button>
          ))}
        </div>
      </div>

      {/* Process Details */}
      {selectedProcess && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedProcess.name}</h3>
                <p className="text-sm text-gray-600 mt-1">Cây trồng: {selectedProcess.crop}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Sửa
                </Button>
                <Button variant="danger" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">STT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả công việc</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Công/ha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tần suất</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phạm vi</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Yêu cầu ảnh</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedProcess.steps.map((step) => (
                    <tr key={step.step} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{step.step}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{step.description}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{step.workPerHa}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{step.frequency}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{step.scope}</td>
                      <td className="px-4 py-4 text-center">
                        {step.requirePhoto ? (
                          <span className="text-green-600 font-medium">✓</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Thêm bước
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
