"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Calendar, Search } from "lucide-react";
import { FilterButton } from "@/components/ui/FilterButton";
import { DateRangePickerModal } from "@/components/ui/DateRangePickerModal";
import { LEDGER_PERIODS, isCompleteRange } from "../utils";
import { LedgerTypeChips } from "./LedgerTypeChips";

const SEARCH_CLASS =
  "pl-12 w-full py-3 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary";

/** Search box, type chips and the period pills (+ custom range) above the register list. */
export function LedgerToolbar({ search, onSearch, type, onType, filter, appliedRange, onSelectPeriod, onApplyRange }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const isCustom = filter === "custom";
  const rangeLabel =
    isCustom && isCompleteRange(appliedRange)
      ? `${format(appliedRange.from, "dd/MM")} - ${format(appliedRange.to, "dd/MM")}`
      : "Custom";

  return (
    <div className="flex flex-col gap-4 print:hidden">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            autoComplete="off"
            type="text"
            placeholder="Search item, note or invoice…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className={SEARCH_CLASS}
            data-testid="ledger-search"
          />
        </div>
        <LedgerTypeChips value={type} onChange={onType} withAll testIdPrefix="ledger-filter" />
      </div>

      <div
        className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl w-full lg:w-auto"
        data-testid="ledger-period-filters"
      >
        {LEDGER_PERIODS.map((period) => (
          <FilterButton
            key={period.value}
            label={period.label}
            active={filter === period.value}
            className="sm:flex-none"
            onClick={() => onSelectPeriod(period.value)}
            data-testid={`ledger-period-${period.value}`}
          />
        ))}
        <FilterButton
          active={isCustom}
          onClick={() => setShowCalendar(true)}
          className="col-span-2 sm:flex-none"
          data-testid="ledger-period-custom"
          label={
            <span className="flex items-center justify-center gap-2">
              <Calendar size={16} />
              <span>{rangeLabel}</span>
            </span>
          }
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

export default LedgerToolbar;
