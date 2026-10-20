"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "aj:sidebar-collapsed";

/** Sidebar open/closed state, remembered per browser. Starts expanded on the server to avoid hydration mismatches. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* storage unavailable (private mode) — stay expanded */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
