import React from "react";

interface StatusBadgeProps {
  status: "good" | "warning" | "danger" | "pending" | "in-progress" | "completed" | "overdue" | "active" | "resolved";
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const colors = {
    good: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
    "in-progress": "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    active: "bg-green-100 text-green-800",
    resolved: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {children}
    </span>
  );
}
