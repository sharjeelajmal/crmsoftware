"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

/** Cache key of GET /api/cut-list; cleared after every cutting entry (its last cut number changes). */
export const CUT_LIST_CACHE = "cut-list";

/**
 * The open cut list for the cutting form (client, 2026-11-23): `{ current, lastCutNumber, cuts, history }` or null
 * until loaded (quiet on errors: the hint is a help, never a blocker), and `close()` for the admin — closes the list
 * he sees, so a second click or a second admin never closes two. Resolves true when it was closed.
 */
export function useCutList() {
  const toast = useToast();
  const [isClosing, setIsClosing] = useState(false);
  const { data, setData, reload } = useAsyncData(() => api.get("/api/cut-list"), [], {
    initialData: null,
    cacheKey: CUT_LIST_CACHE,
  });

  const close = useCallback(async () => {
    if (!data) return false;
    setIsClosing(true);
    try {
      const next = await api.post("/api/cut-list/close", { current: data.current });
      setData(next);
      toast.success(`List ${data.current} closed — list ${next.current} starts again from cut 1`);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      reload();
      return false;
    } finally {
      setIsClosing(false);
    }
  }, [data, reload, setData, toast]);

  return { cutList: data, close, isClosing, reload };
}

export default useCutList;
