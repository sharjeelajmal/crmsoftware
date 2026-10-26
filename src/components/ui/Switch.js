"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * On/off switch row (never a native checkbox): label + optional description on the left, a sliding knob on the
 * right. The whole row is one `role="switch"` button, so it works with mouse, touch and keyboard (Space / Enter).
 */
export function Switch({ checked, onChange, label, description, className = "", testId, disabled = false }) {
  const reduceMotion = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "w-full flex items-center justify-between gap-3 p-3 bg-gray-100 rounded-xl text-left cursor-pointer " +
        "outline-none transition-colors hover:bg-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary " +
        `disabled:opacity-50 disabled:cursor-not-allowed ${className}`
      }
      data-testid={testId}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-700">{label}</span>
        {description && <span className="block text-xs font-normal text-gray-500">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-primary" : "bg-gray-300"}`}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}

export default Switch;
