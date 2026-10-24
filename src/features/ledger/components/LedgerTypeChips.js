"use client";

import { FilterButton } from "@/components/ui/FilterButton";
import { TYPE_FILTERS } from "../utils";

/**
 * B-Pair / Accessory / Fabric chips. With `withAll` the first chip is "All" (list filter);
 * without it the chips pick the entry type in the form.
 */
export function LedgerTypeChips({ value, onChange, withAll = false, testIdPrefix = "ledger-type" }) {
  const chips = withAll ? TYPE_FILTERS : TYPE_FILTERS.filter((chip) => chip.value);
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1 bg-gray-100 rounded-xl w-full sm:w-auto"
      role="group"
      data-testid={`${testIdPrefix}-chips`}
    >
      {chips.map((chip) => (
        <FilterButton
          key={chip.value || "all"}
          label={chip.label}
          active={value === chip.value}
          className="flex-1 sm:flex-none"
          onClick={() => onChange(chip.value)}
          data-testid={`${testIdPrefix}-${chip.value || "all"}`}
        />
      ))}
    </div>
  );
}

export default LedgerTypeChips;
