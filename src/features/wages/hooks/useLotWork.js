"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { lotWorkTotals } from "@/constants/wages";
import { toWorkSheetPayload } from "../utils";

/** Work entries of one invoice (admin), saving a work sheet, removing an entry, and the labour totals. */
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

  /** Saves every operation of the work sheet in one go. */
  const assign = useCallback(
    async (sheet) => {
      setIsSaving(true);
      try {
        const saved = await api.post("/api/work-entries", toWorkSheetPayload(lotId, sheet));
        clearAsyncDataCache("wages:");
        clearAsyncDataCache(`work-entries:${lotId}`);
        const workers = new Set(saved.map((entry) => String(entry.workerId))).size;
        toast.success(
          `Work saved · ${workers} ${workers === 1 ? "worker" : "workers"} · ${saved.length} ${saved.length === 1 ? "entry" : "entries"}`
        );
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
