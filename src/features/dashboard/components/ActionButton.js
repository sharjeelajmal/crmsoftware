"use client";

/** Full-width brand button used in the dashboard side cards (Quick Actions, Add New Item). */
export function ActionButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-white font-semibold py-3 rounded-xl transition-opacity hover:opacity-90 cursor-pointer bg-primary"
    >
      {children}
    </button>
  );
}

export default ActionButton;
