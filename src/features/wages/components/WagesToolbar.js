"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { FilterButton } from "@/components/ui/FilterButton";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DateRangePickerModal } from "@/components/ui/DateRangePickerModal";
import { WAGE_PERIODS, isCompleteRange, workerOptions } from "../utils";

const ALL_WORKERS = { value: "", label: "All workers" };

/** Period pills (this week / last week / 15 days / this month / custom) plus the worker filter. */
export function WagesToolbar({ filter, appliedRange, onSelectPeriod, onApplyRange, workers, workerId, onWorker }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const isCustom = filter === "custom";
  const rangeLabel =
    isCustom && isCompleteRange(appliedRange)
      ? `${format(appliedRange.from, "dd/MM")} - ${format(appliedRange.to, "dd/MM")}`
      : "Custom";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 print:hidden">
      <div
        className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl w-full lg:w-auto"
        data-testid="wages-period-filters"
      >
        {WAGE_PERIODS.map((period) => (
          <FilterButton
            key={period.value}
            label={period.label}
            active={filter === period.value}
            className="sm:flex-none"
            onClick={() => onSelectPeriod(period.value)}
            data-testid={`wages-period-${period.value}`}
          />
        ))}
        <FilterButton
          active={isCustom}
          onClick={() => setShowCalendar(true)}
          className="col-span-2 sm:flex-none"
          data-testid="wages-period-custom"
          label={
            <span className="flex items-center justify-center gap-2">
              <Calendar size={16} />
              <span>{rangeLabel}</span>
            </span>
          }
        />
      </div>
      <div className="w-full lg:w-64" data-testid="wages-worker-filter">
        <SelectDropdown
          options={[ALL_WORKERS, ...workerOptions(workers)]}
          selected={workerId}
          onSelect={onWorker}
          placeholder="All workers"
        />
      </div>
      <AnimatePresence>
        {showCalendar && (
          <DateRangePickerModal
            initialRange={appliedRange}
            onClose={() => setShowCalendar(false)}
            onApply={(range) => {
              onApplyRange(range);
              setShowCalendar(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default WagesToolbar;
