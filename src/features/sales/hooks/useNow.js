"use client";

import { useEffect, useState } from "react";

/**
 * Current time, refreshed every second. Starts as `null` so the server render
 * and the first client render match (locale strings differ between the two).
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
