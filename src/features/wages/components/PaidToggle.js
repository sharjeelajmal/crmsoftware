"use client";

import { Check } from "lucide-react";

/**
 * Paid / Unpaid pill — the app's own toggle, never a native checkbox: green "Paid ✓" or grey "Unpaid"; pressing it
 * switches. `tip` explains a disabled one.
 */
export function PaidToggle({ paid, onToggle, disabled = false, tip, testId }) {
  return (
    <button
      type="button"
      aria-pressed={paid}
      onClick={onToggle}
      disabled={disabled}
      data-tip={tip || undefined}
      className={
        "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold " +
        "whitespace-nowrap transition-colors cursor-pointer outline-none focus-visible:ring-2 " +
        "focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed " +
        (paid
          ? "bg-success-soft text-success border-success-border hover:bg-success-soft/70"
          : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary")
      }
      data-testid={testId}
      data-paid={paid ? "true" : "false"}
    >
      {paid && <Check size={12} strokeWidth={3} />}
      {paid ? "Paid" : "Unpaid"}
    </button>
  );
}

export default PaidToggle;
