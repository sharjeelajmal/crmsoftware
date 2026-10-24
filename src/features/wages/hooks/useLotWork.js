"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { lotWorkTotals } from "@/constants/wages";
import { toAssignmentPayload } from "../utils";

/** Work entries of one lot (admin), the assign/delete mutations and the lot's labour totals. */
export function useLotWork(lot) {
  const toast = useToast();
  const lotId = lot?._id;
  const [isSaving, setIsSaving] = useState(false);
  const { data, isLoading, error, reload } = useAsyncData(
    () => api.get(`/api/work-entries?lotId=${encodeURIComponent(lotId)}`),
    [lotId],
    { enabled: Boolean(lotId), initialData: [], cacheKey: `work-entries:${lotId}` }
  );

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const entries = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const totals = useMemo(() => lotWorkTotals(entries, lot), [entries, lot]);

  const assign = useCallback(
    async (form) => {
      setIsSaving(true);
      try {
        const saved = await api.post("/api/work-entries", toAssignmentPayload(lotId, form));
        clearAsyncDataCache("wages:");
        toast.success(`${saved.length} work ${saved.length === 1 ? "entry" : "entries"} saved`);
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [lotId, reload, toast]
  );

  const removeEntry = useCallback(
    async (entryId) => {
      try {
        await api.delete(`/api/work-entries/${entryId}`);
        clearAsyncDataCache("wages:");
        toast.success("Work entry removed");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  return { entries, totals, isLoading, isSaving, assign, removeEntry, reload };
}
