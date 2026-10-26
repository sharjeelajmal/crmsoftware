"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CalendarRange, X } from "lucide-react";
import { DateRangePickerModal } from "@/components/ui/DateRangePickerModal";
import { rangeLabel } from "@/constants/datePresets";

/**
 * Filter button for a day range, e.g. "Added: This month" or "Date: 1 Oct – 26 Oct 2026". Opens the shared date
 * range picker (presets + calendar); the small × clears it back to `allLabel`.
 */
export function DateRangeButton({ range, onChange, prefix = "Added", allLabel = "All time", className = "", testId }) {
  const [open, setOpen] = useState(false);
  const active = Boolean(range?.from && range?.to);
  const label = rangeLabel(range, allLabel);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "w-full flex items-center gap-2 pl-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary " +
          "cursor-pointer transition-colors " +
          (active
            ? "pr-11 border-primary/40 bg-primary-soft text-primary"
            : "pr-4 border-gray-200 bg-white text-gray-700 hover:border-primary/30")
        }
        aria-label={`${prefix}: ${label}`}
        data-testid={testId}
      >
        <CalendarRange size={18} className="shrink-0" />
        <span className="font-semibold truncate">
          <span className={active ? "text-primary/70" : "text-gray-500"}>{prefix}: </span>
          {label}
        </span>
      </button>
      {active && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Clear the date filter"
          className={
            "absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7 rounded-md text-primary " +
            "hover:bg-white transition-colors cursor-pointer"
          }
          data-testid={testId ? `${testId}-clear` : undefined}
        >
          <X size={16} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <DateRangePickerModal
            initialRange={range ?? undefined}
            onClose={() => setOpen(false)}
            onApply={(picked) => {
              onChange(picked);
              setOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default DateRangeButton;
