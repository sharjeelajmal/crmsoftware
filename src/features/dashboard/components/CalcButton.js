"use client";

const TONE_CLASS = {
  default: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  primary: "bg-primary text-white hover:opacity-90",
};

export function CalcButton({ children, onClick, tone = "default", className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-bold py-3 rounded-md transition-colors cursor-pointer ${TONE_CLASS[tone] ?? TONE_CLASS.default} ${className}`}
    >
      {children}
    </button>
  );
}

export default CalcButton;
