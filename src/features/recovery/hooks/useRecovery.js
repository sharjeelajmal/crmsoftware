"use client";

import { useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { useBalanceUpdate } from "@/features/customers/hooks/useBalanceUpdate";

const EMPTY = { customers: [], stats: {} };

/** Debtors + summary stats from /api/recovery, and the balance mutation used by the table. */
export function useRecovery() {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(() => api.get("/api/recovery"), [], {
    initialData: EMPTY,
    cacheKey: "recovery",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const updateBalance = useBalanceUpdate(reload);

  return {
    customers: Array.isArray(data?.customers) ? data.customers : EMPTY.customers,
    stats: data?.stats ?? EMPTY.stats,
    isLoading,
    reload,
    updateBalance,
  };
}
