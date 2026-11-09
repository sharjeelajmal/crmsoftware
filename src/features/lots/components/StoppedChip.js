"use client";

import { PauseCircle } from "lucide-react";

/** "Stopped" chip shown next to an invoice number while the invoice is stopped (renders nothing otherwise). */
export function StoppedChip({ lot, className = "" }) {
  if (!lot?.hold) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200 ${className}`}
      data-testid="lot-stopped-chip"
    >
      <PauseCircle size={12} /> Stopped
    </span>
  );
}

export default StoppedChip;
