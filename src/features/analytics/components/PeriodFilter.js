"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { FilterButton } from "@/components/ui/FilterButton";
import { CustomRangeModal } from "./CustomRangeModal";
import { PERIODS, isCompleteRange } from "../utils";

/** Today / Last 7 Days / This Year pills plus the custom range button. */
export function PeriodFilter({ filter, appliedRange, onSelectPeriod, onApplyRange }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const isCustom = filter === "custom";

  const rangeLabel =
    isCustom && isCompleteRange(appliedRange)
      ? `${format(appliedRange.from, "dd/MM")} - ${format(appliedRange.to, "dd/MM")}`
      : "Custom Range";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-2 bg-white rounded-xl shadow-sm w-full lg:w-auto">
        {PERIODS.map((period) => (
          <FilterButton
            key={period.value}
            label={period.label}
            active={filter === period.value}
            className="flex-1 sm:flex-none"
            onClick={() => onSelectPeriod(period.value)}
          />
        ))}
        <button
          type="button"
          onClick={() => setShowCalendar(true)}
          className={
            "flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg " +
            "transition-all duration-300 cursor-pointer " +
            (isCustom ? "bg-primary text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100")
          }
        >
          <Calendar size={18} />
          <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">{rangeLabel}</span>
        </button>
      </div>

      <AnimatePresence>
        {showCalendar && (
          <CustomRangeModal
            initialRange={appliedRange}
            onClose={() => setShowCalendar(false)}
            onApply={(range) => {
              onApplyRange(range);
              setShowCalendar(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
