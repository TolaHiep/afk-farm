import React from "react";
import { Button } from "./button";

export function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl border border-gray-200 w-full ${wide ? "max-w-lg" : "max-w-md"} p-6 space-y-4 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function FormActions({ onClose, onSave, disabled = false }: { onClose: () => void; onSave: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Button variant="secondary" onClick={onClose}>Hủy</Button>
      <Button variant="primary" onClick={onSave} disabled={disabled}>Lưu</Button>
    </div>
  );
}

export function ConfirmDialog({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Hủy</Button>
          <Button variant="danger" onClick={onConfirm}>Xóa</Button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg";
export { inputCls };
