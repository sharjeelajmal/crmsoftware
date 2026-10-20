"use client";

import { useEffect, useRef, useState } from "react";
import { InvoiceDocument } from "./InvoiceDocument";

// Natural size of the InvoiceDocument canvas (see InvoiceDocument.js).
const DOC_WIDTH = 820;
const DOC_HEIGHT = 1160;
const MAX_SCALE = 0.8; // desktop preview was always shown at 80%

/**
 * On-screen invoice preview that scales the fixed A4 layout to fit its container,
 * so it is readable on phones and tablets without horizontal scrolling.
 */
export function InvoicePreview({ sale }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(MAX_SCALE);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const update = () => setScale(Math.min(MAX_SCALE, el.clientWidth / DOC_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div style={{ height: DOC_HEIGHT * scale, width: DOC_WIDTH * scale, margin: "0 auto" }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: DOC_WIDTH }}>
          <InvoiceDocument sale={sale} forPDF />
        </div>
      </div>
    </div>
  );
}

export default InvoicePreview;
