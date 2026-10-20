"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);
const DEFAULT_DURATION_MS = 4000;

const ICONS = {
  success: <CheckCircle className="text-green-500" size={24} />,
  error: <AlertTriangle className="text-red-500" size={24} />,
  info: <Info className="text-blue-500" size={24} />,
};

/**
 * App-wide notifications (replaces window.alert and the per-page NotificationPopup copies).
 *
 *   const toast = useToast();
 *   toast.success("Saved!"); toast.error("Failed"); toast.info("Heads up");
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(0);

  // Portal target exists only in the browser.
  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message, duration = DEFAULT_DURATION_MS) => {
      const id = ++nextId.current;
      setToasts((list) => [...list, { id, type, message }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message, duration) => push("success", message, duration),
      error: (message, duration) => push("error", message, duration),
      info: (message, duration) => push("info", message, duration),
      dismiss,
    }),
    [push, dismiss]
  );

  // Rendered through a portal on <body> with the top z-index layer (see globals.css "Z-INDEX LAYERS"),
  // so no overlay, modal, loader or transformed ancestor can ever cover a toast.
  const viewport = (
    <div className="toast-viewport fixed bottom-5 right-5 flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-4 pointer-events-auto max-w-sm"
            role="status"
          >
            {ICONS[t.type] ?? ICONS.info}
            <p className="font-semibold text-gray-800">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {mounted ? createPortal(viewport, document.body) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
