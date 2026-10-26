"use client";

import { Check, Plane, X } from "lucide-react";
import { ATTENDANCE_LABELS, ATTENDANCE_STATUSES } from "@/constants/attendance";

const ICONS = { present: Check, absent: X, leave: Plane };

const ACTIVE = {
  present: "bg-success text-white shadow-sm",
  absent: "bg-danger text-white shadow-sm",
  leave: "bg-yellow-500 text-white shadow-sm",
};

const IDLE = {
  present: "text-gray-600 hover:bg-success-soft hover:text-success",
  absent: "text-gray-600 hover:bg-danger-soft hover:text-danger",
  leave: "text-gray-600 hover:bg-yellow-50 hover:text-yellow-700",
};

/**
 * Present / Absent / Leave as one segmented control (a radio group). Tapping the chosen status again clears the
 * mark. `testId` prefixes each button: `${testId}-present` …
 */
export function StatusToggle({ value = "", onChange, label, testId = "attendance", className = "" }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 ${className}`}
    >
      {ATTENDANCE_STATUSES.map((status) => {
        const Icon = ICONS[status];
        const active = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? "" : status)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              active ? ACTIVE[status] : IDLE[status]
            }`}
            data-testid={`${testId}-${status}`}
          >
            <Icon size={15} className="shrink-0" />
            {ATTENDANCE_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}

export default StatusToggle;
