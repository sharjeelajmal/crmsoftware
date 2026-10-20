"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { STAGE_ACTIONS, applyStageAction } from "@/constants/lots";

/**
 * Admin-only stage transition (POST /api/lots/:id/stage).
 * `runAction(lot, key, { qty, note })` resolves with the updated lot (incl. events) or null on failure.
 * The transition is pre-validated with the shared rules so obvious mistakes never reach the server.
 */
export function useStageAction() {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runAction = useCallback(
    async (lot, actionKey, { qty, note } = {}) => {
      const action = STAGE_ACTIONS[actionKey];
      try {
        applyStageAction(lot, actionKey, { qty });
      } catch (err) {
        toast.error(err.message);
        return null;
      }

      setIsSubmitting(true);
      try {
        const payload = { action: actionKey };
        if (action.needsQty) payload.qty = Math.trunc(Number(qty));
        if (note && note.trim()) payload.note = note.trim();
        const updated = await api.post(`/api/lots/${lot._id}/stage`, payload);
        // Lists, summary, report and the cutting master's own list are stale now.
        clearAsyncDataCache("lots:");
        clearAsyncDataCache("lots-summary");
        clearAsyncDataCache("my-lots");
        clearAsyncDataCache("lot-report");
        toast.success(`${updated.lotNumber || "Lot"}: ${action.label} saved`);
        return updated;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [toast]
  );

  return { runAction, isSubmitting };
}
