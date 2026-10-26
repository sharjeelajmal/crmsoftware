"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { rateCardProblem } from "@/constants/operations";

/** Every category with its rate card (admin) and saving a card. */
export function useRateCards({ enabled = true } = {}) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { data, isLoading, error, reload } = useAsyncData(() => api.get("/api/operation-sets"), [], {
    initialData: { categories: [] },
    enabled,
    cacheKey: "rate-cards",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  /** `rows` are the editor rows; the chosen ones (with their rates) become the card. */
  const saveCard = useCallback(
    async (category, rows) => {
      const chosen = rows.filter((row) => row.chosen);
      const problem = rateCardProblem(chosen);
      if (problem) {
        toast.info(problem);
        return false;
      }
      setIsSaving(true);
      try {
        await api.put(`/api/operation-sets/${encodeURIComponent(category)}`, {
          items: chosen.map((row) => ({ operationId: row.operationId, rate: Number(row.rate) })),
        });
        clearAsyncDataCache("lot-operations:");
        toast.success(chosen.length ? `${category} rate card saved` : `${category} rate card removed`);
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [reload, toast]
  );

  return { categories: data?.categories ?? [], isLoading, isSaving, saveCard, reload };
}

export default useRateCards;
