"use client";

import { useEffect, useRef, useState } from "react";

/** `[ref, width]`: the element's current content width in px (0 until measured), kept up to date on resize. */
export function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

export default useElementWidth;
