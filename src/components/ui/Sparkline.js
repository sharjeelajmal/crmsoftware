"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useElementWidth } from "@/hooks/useElementWidth";

const PAD = 5; // room for the end dot and its ring

// `muted`: grey line on a white card with the latest point in brand blue. `onBrand`: white on the blue hero card.
const TONES = {
  muted: {
    line: "stroke-chart-muted",
    area: "fill-chart-muted/10",
    dot: "fill-primary stroke-surface",
  },
  onBrand: {
    line: "stroke-white/70",
    area: "fill-white/10",
    dot: "fill-white stroke-primary",
  },
};

/**
 * Tiny trend line (2px, 10% wash, latest point marked). Decorative: the numbers it draws are always shown
 * as text next to it or in a table, so it is hidden from screen readers.
 */
export function Sparkline({ data = [], height = 36, tone = "muted", className = "" }) {
  const [ref, width] = useElementWidth();
  const reduceMotion = useReducedMotion();
  const values = data.map((n) => Number(n) || 0);
  const styles = TONES[tone] ?? TONES.muted;

  let shape = null;
  if (width > PAD * 2 && values.length > 1) {
    const min = Math.min(0, ...values);
    const max = Math.max(...values, min + 1);
    const x = (i) => PAD + (i * (width - PAD * 2)) / (values.length - 1);
    const y = (v) => PAD + (height - PAD * 2) * (1 - (v - min) / (max - min));
    const points = values.map((v, i) => [x(i), y(v)]);
    const line = points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const base = y(min).toFixed(1);
    const area = `${line} L${points.at(-1)[0].toFixed(1)},${base} L${points[0][0].toFixed(1)},${base} Z`;
    shape = { line, area, end: points.at(-1) };
  }

  return (
    <div ref={ref} className={`w-full ${className}`} style={{ height }} aria-hidden="true">
      {shape && (
        <svg width={width} height={height} className="block overflow-visible">
          <path d={shape.area} className={styles.area} />
          <motion.path
            d={shape.line}
            className={`${styles.line} fill-none`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <circle cx={shape.end[0]} cy={shape.end[1]} r={4} strokeWidth={2} className={styles.dot} />
        </svg>
      )}
    </div>
  );
}

export default Sparkline;
