"use client";

import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { hasSizes, sizeOptions } from "@/features/inventory/utils";

/** "32 (8 left)" in the menu, just "32" on the compact button. */
const pickerOptions = (product) => sizeOptions(product).map((option) => ({ ...option, short: option.value }));

/**
 * Size picker for one sale item: the app's custom dropdown, compact, with the menu portaled so the invoice
 * table and the edit-sale popup can't clip it. Products without sizes show the stored size as plain text
 * (legacy rows / products no longer in the list), or `emptyText` when there is none.
 */
export function SaleItemSizeSelect({ product, value, onChange, className = "", textPrefix = "", emptyText = null }) {
  if (!hasSizes(product)) {
    if (!value) return emptyText;
    return (
      <span className={`text-xs text-gray-600 ${className}`}>
        {textPrefix}
        {value}
      </span>
    );
  }
  return (
    <SelectDropdown
      size="sm"
      portal
      options={pickerOptions(product)}
      selected={value ?? ""}
      onSelect={onChange}
      placeholder="Size"
      ariaLabel="Size"
      testId="sale-item-size"
      className={className}
    />
  );
}

export default SaleItemSizeSelect;
