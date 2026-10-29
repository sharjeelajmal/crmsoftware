"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { dispatchOutProblem, dispatchRows, piecesOf } from "@/constants/dispatch";

/** Dispatching a Ready lot's pieces (admin): the parties used before, and the save. Returns the new gate pass. */
export function useDispatchOut(lot) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { data: parties } = useAsyncData(() => api.get("/api/gate-passes/parties"), [], {
    initialData: [],
    cacheKey: "dispatch-parties",
  });

  const dispatch = useCallback(
    async ({ party, sizes, note }) => {
      const problem = dispatchOutProblem(lot, { sizes, party });
      if (problem) {
        toast.info(problem);
        return null;
      }
      setIsSaving(true);
      try {
        const rows = dispatchRows(sizes);
        const { pass } = await api.post(`/api/lots/${lot._id}/dispatch-out`, {
          party: party.trim(),
          sizes: rows,
          note: String(note || "").trim(),
        });
        for (const key of [
          `lot:${lot._id}`,
          `gate-passes:${lot._id}`,
          "inventory",
          "dispatch-parties",
          "lots",
          "dashboard",
        ]) {
          clearAsyncDataCache(key);
        }
        toast.success(`${pass.number} · ${piecesOf(rows)} pcs to ${pass.party}`);
        return pass;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [lot, toast]
  );

  return { parties: Array.isArray(parties) ? parties : [], dispatch, isSaving };
}

export default useDispatchOut;
