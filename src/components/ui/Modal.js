"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { BodyPortal } from "./BodyPortal";

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-4xl",
};

/**
 * Centered modal with backdrop, rendered on <body> (see BodyPortal). Render inside an <AnimatePresence> for exit
 * animation.
 *
 * @param {object} props
 * @param {() => void} props.onClose
 * @param {"sm"|"md"|"lg"|"xl"} [props.size="md"]
 * @param {boolean} [props.padded=true]  false for content that manages its own padding (invoices, tables)
 */
export function Modal({ children, onClose, size = "md", padded = true, className = "" }) {
  return (
    <BodyPortal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-white rounded-2xl shadow-xl w-full ${SIZE_CLASS[size] ?? SIZE_CLASS.md} relative flex flex-col ${className}`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20 cursor-pointer"
          >
            <X size={24} />
          </button>
          <div className={`${padded ? "p-5 sm:p-8" : "p-1 sm:p-2"} overflow-y-auto overflow-x-auto max-h-[90vh]`}>
            {children}
          </div>
        </motion.div>
      </motion.div>
    </BodyPortal>
  );
}

export default Modal;
