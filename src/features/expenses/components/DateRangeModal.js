"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { isCompleteRange } from "../utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const FIRST_YEAR = 2020;

const APPLY_BUTTON_CLASS =
  "px-6 py-2 bg-primary text-white font-semibold rounded-lg transition-all duration-300 " +
  "disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90";

/** Two-month range picker for the "Custom" period filter. Render inside <AnimatePresence>. */
export function DateRangeModal({ range, onRangeChange, onApply, onClose }) {
  const canApply = isCompleteRange(range);
  // Two months side by side need ~640px; phones get a single month.
  const twoMonths = useMediaQuery("(min-width: 768px)");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl p-2 sm:p-4 relative max-w-[96vw] overflow-x-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors z-10"
        >
          <X size={20} />
        </button>
        <DayPicker
          mode="range"
          selected={range}
          onSelect={onRangeChange}
          numberOfMonths={twoMonths ? 2 : 1}
          defaultMonth={range.from || new Date()}
          captionLayout="dropdown"
          startMonth={new Date(FIRST_YEAR, 0)}
          endMonth={new Date(new Date().getFullYear() + 1, 11)}
        />
        <div className="flex justify-end p-2 border-t border-gray-200 mt-2">
          <button type="button" onClick={onApply} disabled={!canApply} className={APPLY_BUTTON_CLASS}>
            Apply Range
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default DateRangeModal;
