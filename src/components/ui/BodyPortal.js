"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * Renders its children on <body>. Full-screen overlays (modals, the date picker) must not live inside a card: an
 * ancestor with `backdrop-filter` or `transform` turns `position: fixed` into "fixed to that card", so the overlay
 * would be clipped and misplaced. Nothing is rendered on the server (no <body> there); React context (and so
 * AnimatePresence exit animations) still flows through the portal.
 */
export function BodyPortal({ children }) {
  const isClient = useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
  return isClient ? createPortal(children, document.body) : null;
}

export default BodyPortal;
