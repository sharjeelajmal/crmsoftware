"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.2, 0.8, 0.2, 1];
const TRANSITION = { height: { duration: 0.32, ease: EASE }, opacity: { duration: 0.22, ease: "easeOut" } };

/**
 * Smoothly expands / collapses its children (height + fade) instead of popping them in.
 * Content is mounted only while `open`. Already-open sections do not animate on first render.
 * Put any spacing *inside* the children (e.g. `pt-4`) so the gap animates with the height.
 */
export function Collapse({ open, children, className = "", testId }) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          initial={{ height: 0, opacity: 0, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
          exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          transition={reduceMotion ? { duration: 0 } : TRANSITION}
          className={className}
          data-testid={testId}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Collapse;
