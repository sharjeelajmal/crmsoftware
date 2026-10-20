"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/Button";
import { EMPTY_RANGE, isCompleteRange } from "../utils";

/**
 * Two-month range picker. The selection stays local until "Apply Range";
 * closing the modal discards it. Render inside an <AnimatePresence>.
 */
export function CustomRangeModal({ initialRange, onApply, onClose }) {
  // Two months side by side need ~640px; phones get a single month.
  const twoMonths = useMediaQuery("(min-width: 768px)");
  const [range, setRange] = useState(initialRange ?? EMPTY_RANGE);

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
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl p-2 sm:p-4 relative max-w-[96vw] overflow-x-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors z-10 cursor-pointer"
        >
          <X size={20} />
        </button>

        <DayPicker
          mode="range"
          selected={range}
          onSelect={(next) => setRange(next ?? EMPTY_RANGE)}
          numberOfMonths={twoMonths ? 2 : 1}
          defaultMonth={range.from || new Date()}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(new Date().getFullYear() + 1, 11)}
        />

        <div className="flex justify-end p-2 border-t border-gray-200 mt-2">
          <Button onClick={() => onApply(range)} disabled={!isCompleteRange(range)}>
            Apply Range
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
