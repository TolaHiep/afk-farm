import React from "react";
import { Plus, Edit2, Trash2, Upload, Download } from "lucide-react";
import { Button } from "../ui/button";
import { Modal, Field, FormActions, ConfirmDialog, inputCls } from "../ui/FormModal";
import { getProcesses, createProcess, updateProcess, deleteProcess as apiDeleteProcess, importProcessExcel, PROCESS_TEMPLATE_URL } from "../../lib/queries";

interface Step { step: number; description: string; workPerHa: number; frequency: string; frequencyType: string; frequencyValue: number; scope: string; scopeRaw: string; requirePhoto: boolean; }
interface Process { id: string; name: string; crop: string; steps: Step[]; }

const FREQ_OPTIONS: { value: string; label: string }[] = [
  { value: "one_time", label: "1 lần/chu kỳ" },
  { value: "daily", label: "Hàng ngày" },
  { value: "every_n_days", label: "N ngày/lần" },
  { value: "n_per_day", label: "N lần/ngày" },
];

const emptyProcess = (): Process => ({ id: "", name: "", crop: "Gấc", steps: [] });
const emptyStep = (): Step => ({ step: 0, description: "", workPerHa: 0, frequency: "", frequencyType: "one_time", frequencyValue: 1, scope: "", scopeRaw: "shared", requirePhoto: false });

// Chuẩn hóa bước để gửi lên API (chỉ field backend cần)
const toApiSteps = (steps: Step[]) =>
  steps.map((s) => ({ description: s.description, workPerHa: s.workPerHa, frequencyType: s.frequencyType,
    frequencyValue: s.frequencyValue, scopeRaw: s.scopeRaw, requirePhoto: s.requirePhoto }));

type ProcModal = { mode: "add" | "edit"; data: Process } | null;
type StepModal = { mode: "add" | "edit"; procId: string; index: number; data: Step } | null;
type Confirm = { kind: "process"; id: string; name: string } | { kind: "step"; procId: string; index: number; name: string } | null;

export function ProcessManagement() {
  const [procs, setProcs] = React.useState<Process[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [procModal, setProcModal] = React.useState<ProcModal>(null);
  const [stepModal, setStepModal] = React.useState<StepModal>(null);
  const [confirm, setConfirm] = React.useState<Confirm>(null);
  const [importing, setImporting] = React.useState(false);
  const [overwrite, setOverwrite] = React.useState<{ name: string; b64: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reload = (selectId?: string) =>
    getProcesses().then((data: Process[]) => {
      setProcs(data);
      setSelectedId((cur) => selectId ?? (data.some((p) => p.id === cur) ? cur : data[0]?.id ?? ""));
    });

  React.useEffect(() => {
    reload().catch(() => setProcs([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải…</div>;

  const selected = procs.find((p) => p.id === selectedId) || procs[0];

  // ===== CRUD quy trình (gọi API thật) =====
  const saveProcess = async (data: Process) => {
    if (!data.name.trim()) return;
    try {
      if (data.id) {
        const res = await updateProcess(data.id, { process_name: data.name, crop: data.crop });
        await reload(res?.id ?? data.id);
      } else {
        const res = await createProcess({ process_name: data.name, crop: data.crop, steps: [] });
        await reload(res?.id);
      }
      setProcModal(null);
    } catch (e) {
      alert("Lưu quy trình thất bại: " + (e as Error).message);
    }
  };
  const deleteProcess = async (id: string) => {
    try {
      await apiDeleteProcess(id);
      await reload();
    } catch (e) {
      alert("Xóa quy trình thất bại: " + (e as Error).message);
    }
    setConfirm(null);
  };

  // ===== CRUD bước: cập nhật mảng bước rồi lưu cả quy trình =====
  const persistSteps = async (procId: string, steps: Step[]) => {
    const proc = procs.find((p) => p.id === procId);
    if (!proc) return;
    await updateProcess(procId, { process_name: proc.name, crop: proc.crop, steps: toApiSteps(steps) });
    await reload(procId);
  };
  const saveStep = async (procId: string, index: number, data: Step) => {
    if (!data.description.trim()) return;
    const proc = procs.find((p) => p.id === procId);
    if (!proc) return;
    const steps = [...proc.steps];
    if (index >= 0) steps[index] = data;
    else steps.push(data);
    try {
      await persistSteps(procId, steps);
      setStepModal(null);
    } catch (e) {
      alert("Lưu bước thất bại: " + (e as Error).message);
    }
  };
  const deleteStep = async (procId: string, index: number) => {
    const proc = procs.find((p) => p.id === procId);
    if (!proc) return;
    try {
      await persistSteps(procId, proc.steps.filter((_, i) => i !== index));
    } catch (e) {
      alert("Xóa bước thất bại: " + (e as Error).message);
    }
    setConfirm(null);
  };

  const readB64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result);
        resolve(s.slice(s.indexOf(",") + 1)); // bỏ tiền tố data:...;base64,
      };
      r.onerror = () => reject(new Error("Không đọc được file"));
      r.readAsDataURL(file);
    });

  const doImport = async (b64: string, replace: boolean) => {
    if (replace) setOverwrite(null);
    setImporting(true);
    try {
      const res = await importProcessExcel(b64, replace);
      if (res.exists) {
        setOverwrite({ name: res.name, b64 });
      } else {
        setOverwrite(null);
        await reload(res.name);
        alert(`Đã nhập "${res.name}" (${res.steps} bước).`);
      }
    } catch (e) {
      alert("Nhập thất bại: " + (e as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await readB64(file);
    await doImport(b64, false);
  };

  return (
    <div className="space-y-6">
      {/* Process list */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách quy trình</h3>
          <div className="flex gap-2">
            <a href={PROCESS_TEMPLATE_URL}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" /> Tải mẫu Excel
            </a>
            <Button variant="secondary" size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> {importing ? "Đang nhập…" : "Nhập từ Excel"}
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={onPickFile} />
            <Button variant="primary" size="sm" onClick={() => setProcModal({ mode: "add", data: emptyProcess() })}>
              <Plus className="w-4 h-4 mr-2" /> Thêm quy trình
            </Button>
          </div>
        </div>

        {procs.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có quy trình nào.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {procs.map((p) => (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selected?.id === p.id ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Process detail */}
      {selected && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selected.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Cây trồng: {selected.crop}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setProcModal({ mode: "edit", data: { ...selected } })}>
                <Edit2 className="w-4 h-4 mr-2" /> Sửa
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirm({ kind: "process", id: selected.id, name: selected.name })}>
                <Trash2 className="w-4 h-4 mr-2" /> Xóa
              </Button>
            </div>
          </div>

          <div className="p-6">
            {/* Bảng (chỉ hiện từ md trở lên) */}
            <div className="hidden md:block overflow-x-auto">
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
                  {selected.steps.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Chưa có bước nào. Bấm "Thêm bước" để bắt đầu.</td></tr>
                  )}
                  {selected.steps.map((step, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{step.step}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{step.description}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{step.workPerHa}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{step.frequency}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{step.scope}</td>
                      <td className="px-4 py-4 text-center">
                        {step.requirePhoto ? <span className="text-green-600 font-medium">✓</span> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setStepModal({ mode: "edit", procId: selected.id, index, data: { ...step } })}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Sửa bước">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirm({ kind: "step", procId: selected.id, index, name: step.description })}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa bước">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dạng thẻ (chỉ hiện trên mobile) */}
            <div className="md:hidden space-y-3">
              {selected.steps.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-gray-400">Chưa có bước nào. Bấm "Thêm bước" để bắt đầu.</p>
              ) : (
                selected.steps.map((step, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          {step.step}
                        </span>
                        <p className="text-sm font-semibold text-gray-900 break-words">{step.description}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button onClick={() => setStepModal({ mode: "edit", procId: selected.id, index, data: { ...step } })}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Sửa bước">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirm({ kind: "step", procId: selected.id, index, name: step.description })}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa bước">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Công/ha</span>
                        <span className="text-gray-900 text-right break-words">{step.workPerHa}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Tần suất</span>
                        <span className="text-gray-900 text-right break-words">{step.frequency || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Phạm vi</span>
                        <span className="text-gray-900 text-right break-words">{step.scope || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Yêu cầu ảnh</span>
                        {step.requirePhoto ? <span className="text-green-600 font-medium">✓</span> : <span className="text-gray-400">—</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setStepModal({ mode: "add", procId: selected.id, index: -1, data: emptyStep() })}>
                <Plus className="w-4 h-4 mr-2" /> Thêm bước
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Process modal */}
      {procModal && <ProcessForm modal={procModal} onClose={() => setProcModal(null)} onSave={saveProcess} />}

      {/* Step modal */}
      {stepModal && <StepForm modal={stepModal} onClose={() => setStepModal(null)} onSave={(d) => saveStep(stepModal.procId, stepModal.index, d)} />}

      {/* Confirm delete */}
      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "process" ? `Xóa quy trình "${confirm.name}"?` : `Xóa bước "${confirm.name}"?`}
          message={confirm.kind === "process" ? "Toàn bộ các bước trong quy trình này cũng sẽ bị xóa." : "Bạn có chắc muốn xóa bước này? Các bước sau sẽ được đánh số lại."}
          onCancel={() => setConfirm(null)}
          onConfirm={() => (confirm.kind === "process" ? deleteProcess(confirm.id) : deleteStep(confirm.procId, confirm.index))}
        />
      )}
      {overwrite && (
        <ConfirmDialog
          title={`Quy trình "${overwrite.name}" đã tồn tại — ghi đè?`}
          message="Toàn bộ các bước hiện tại của quy trình này sẽ bị thay bằng nội dung trong file."
          onCancel={() => setOverwrite(null)}
          onConfirm={() => doImport(overwrite.b64, true)}
        />
      )}
    </div>
  );
}

function ProcessForm({ modal, onClose, onSave }: { modal: { mode: "add" | "edit"; data: Process }; onClose: () => void; onSave: (d: Process) => void; }) {
  const [form, setForm] = React.useState<Process>(modal.data);
  return (
    <Modal title={modal.mode === "add" ? "Thêm quy trình" : "Sửa quy trình"} onClose={onClose}>
      <Field label="Tên quy trình *">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Quy trình Gấc" className={inputCls} />
      </Field>
      <Field label="Cây trồng">
        <select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} className={inputCls}>
          <option value="Gấc">Gấc</option>
          <option value="Sâm">Sâm</option>
        </select>
      </Field>
      <FormActions onClose={onClose} onSave={() => onSave(form)} disabled={!form.name.trim()} />
    </Modal>
  );
}

function StepForm({ modal, onClose, onSave }: { modal: { mode: "add" | "edit"; data: Step }; onClose: () => void; onSave: (d: Step) => void; }) {
  const [form, setForm] = React.useState<Step>(modal.data);
  return (
    <Modal title={modal.mode === "add" ? "Thêm bước" : "Sửa bước"} onClose={onClose}>
      <Field label="Mô tả công việc *">
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tưới nước" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Công/ha">
          <input type="number" value={form.workPerHa || ""} onChange={(e) => setForm({ ...form, workPerHa: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Tần suất">
          <select value={form.frequencyType} onChange={(e) => setForm({ ...form, frequencyType: e.target.value })} className={inputCls}>
            {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>
      {(form.frequencyType === "every_n_days" || form.frequencyType === "n_per_day") && (
        <Field label={form.frequencyType === "every_n_days" ? "Số ngày (N)" : "Số lần/ngày (N)"}>
          <input type="number" min={1} value={form.frequencyValue || ""} onChange={(e) => setForm({ ...form, frequencyValue: Number(e.target.value) })} className={inputCls} />
        </Field>
      )}
      <Field label="Phạm vi">
        <select value={form.scopeRaw} onChange={(e) => setForm({ ...form, scopeRaw: e.target.value })} className={inputCls}>
          <option value="shared">Dùng chung</option>
          <option value="per_crop">Theo cây</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={form.requirePhoto} onChange={(e) => setForm({ ...form, requirePhoto: e.target.checked })} className="w-4 h-4" />
        Yêu cầu chụp ảnh khi hoàn thành
      </label>
      <FormActions onClose={onClose} onSave={() => onSave(form)} disabled={!form.description.trim()} />
    </Modal>
  );
}
