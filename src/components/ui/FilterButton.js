"use client";

/**
 * Pill-style toggle used for period / category filters.
 * `wrap`: let a long label break onto a second line inside the pill instead of spilling out (grid layouts on phones).
 */
export function FilterButton({ label, active, onClick, className = "", wrap = false, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...props}
      className={
        "px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 " +
        `cursor-pointer ${wrap ? "whitespace-normal leading-tight break-words min-w-0 h-full" : "whitespace-nowrap"} ` +
        `${active ? "bg-primary text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100"} ${className}`
      }
    >
      {label}
    </button>
  );
}

export default FilterButton;
