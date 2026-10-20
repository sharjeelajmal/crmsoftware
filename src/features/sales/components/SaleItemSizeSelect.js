"use client";

import { hasSizes, sizeOptions } from "@/features/inventory/utils";

const SELECT_CLASS = "bg-gray-100 rounded-md px-1.5 py-1 text-xs text-gray-800 outline-none cursor-pointer max-w-full";

/**
 * Size picker for one sale item. Renders a select when `product` tracks sizes; otherwise the stored
 * size as plain text (legacy rows / products no longer in the list), or `emptyText` when there is none.
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
    <select
      data-testid="sale-item-size"
      aria-label="Size"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`${SELECT_CLASS} ${className}`}
    >
      <option value="">Size</option>
      {sizeOptions(product).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default SaleItemSizeSelect;
