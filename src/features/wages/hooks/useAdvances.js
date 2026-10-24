"use client";

import { useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

const EMPTY = { accounts: [], totals: { workers: 0, given: 0, recovered: 0, balance: 0 } };

/** Every worker's advance account (GET /api/wages/advances); `balanceOf(workerId)` = advance still left. */
export function useAdvances() {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(() => api.get("/api/wages/advances"), [], {
    initialData: EMPTY,
    cacheKey: "wages:advances",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const balanceOf = (workerId) => data.accounts.find((account) => account.workerId === String(workerId))?.balance ?? 0;

  return { accounts: data.accounts, totals: data.totals, balanceOf, isLoading, reload };
}

export default useAdvances;
