"use client";

/** One row of the customer card's "more" menu. */
export function MenuItem({ icon: Icon, text, onClick, isDestructive = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors cursor-pointer ${
        isDestructive ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icon size={16} /> {text}
    </button>
  );
}

export default MenuItem;
