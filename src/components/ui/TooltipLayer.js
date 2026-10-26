"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BodyPortal } from "./BodyPortal";

const DELAY_MS = 300;
const GAP = 8;
const EDGE = 8;

/**
 * App-wide tooltips. Any element with `data-tip="…"` shows a styled tooltip on mouse hover or keyboard focus — the
 * app never uses the browser's own `title` tooltip. Mounted once in the root layout; touch taps don't show tips.
 * Give icon-only buttons an `aria-label` too: the tooltip is visual, the label is what screen readers read.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState(null); // { text, rect }
  const [pos, setPos] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    let current = null;
    let timer = null;
    const hide = () => {
      clearTimeout(timer);
      current = null;
      setTip(null);
    };
    const show = (el) => {
      const text = el.getAttribute("data-tip");
      if (!text) return hide();
      current = el;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (current === el && el.isConnected) setTip({ text, rect: el.getBoundingClientRect() });
      }, DELAY_MS);
    };
    const onOver = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const el = event.target.closest?.("[data-tip]");
      if (el === current) return;
      if (el) show(el);
      else if (current) hide();
    };
    const onFocusIn = (event) => {
      const el = event.target.closest?.("[data-tip]");
      if (el && el.matches?.(":focus-visible")) show(el);
    };
    const onKey = (event) => {
      if (event.key === "Escape") hide();
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  // Above the element (below when there is no room), centred, kept inside the window.
  useLayoutEffect(() => {
    if (!tip) {
      setPos(null);
      return;
    }
    if (!boxRef.current) return;
    const { width, height } = boxRef.current.getBoundingClientRect();
    const { rect } = tip;
    const below = rect.top - GAP - height < EDGE;
    const top = below ? rect.bottom + GAP : rect.top - GAP - height;
    const centre = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(EDGE, Math.min(centre, window.innerWidth - width - EDGE));
    setPos({ top, left, below });
  }, [tip]);

  return (
    <BodyPortal>
      <AnimatePresence>
        {tip && (
          <motion.div
            key={tip.text + tip.rect.top + tip.rect.left}
            ref={boxRef}
            role="tooltip"
            initial={{ opacity: 0, y: pos?.below ? -3 : 3, scale: 0.97 }}
            animate={{ opacity: pos ? 1 : 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className={
              "z-[9500] pointer-events-none max-w-60 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-semibold " +
              "text-white shadow-lg"
            }
            data-testid="tooltip"
          >
            {tip.text}
          </motion.div>
        )}
      </AnimatePresence>
    </BodyPortal>
  );
}

export default TooltipLayer;
