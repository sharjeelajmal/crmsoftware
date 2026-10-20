"use client";

/** Pill-style toggle used for period / category filters. */
export function FilterButton({ label, active, onClick, className = "", ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...props}
      className={
        "px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 " +
        "cursor-pointer whitespace-nowrap " +
        `${active ? "bg-primary text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100"} ${className}`
      }
    >
      {label}
    </button>
  );
}

export default FilterButton;
