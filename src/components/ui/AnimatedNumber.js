"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

const defaultFormat = (n) => Math.round(n).toLocaleString("en-US");

/**
 * A number that counts up to `value` (and from the old value to the new one after a refresh).
 * The visible digits are written straight to the DOM, so counting never re-renders React; screen readers
 * get the final value only. People who prefer reduced motion see the final value at once.
 */
export function AnimatedNumber({ value, format = defaultFormat, duration = 0.9, className = "", testId }) {
  const target = Number(value) || 0;
  const ref = useRef(null);
  const shown = useRef(0);
  const formatRef = useRef(format);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const write = (n) => {
      shown.current = n;
      node.textContent = formatRef.current(n);
    };
    if (reduceMotion || shown.current === target) {
      write(target);
      return undefined;
    }
    write(shown.current);
    const controls = animate(shown.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: write,
      onComplete: () => write(target),
    });
    return () => controls.stop();
  }, [target, duration, reduceMotion]);

  return (
    <span className={className} data-testid={testId} data-value={target}>
      <span ref={ref} aria-hidden="true" />
      <span className="sr-only">{format(target)}</span>
    </span>
  );
}

export default AnimatedNumber;
