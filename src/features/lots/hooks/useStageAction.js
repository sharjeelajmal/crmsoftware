"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { STAGE_ACTIONS, applyStageAction, readySizesProblem } from "@/constants/lots";

/** Every list that shows lot progress is stale after a stage change. */
export const clearLotCaches = () => {
  clearAsyncDataCache("lots:");
  clearAsyncDataCache("lots-summary");
  clearAsyncDataCache("my-lots");
  clearAsyncDataCache("lot-report");
};

/** "Ready" (and its reversal) also changes product stock, so the inventory caches go too. */
export const clearStockCaches = () => {
  clearAsyncDataCache("inventory");
  clearAsyncDataCache("products");
  clearAsyncDataCache("stock-movements:");
};

const toSizesPayload = (sizes = []) =>
  sizes.map((row) => ({ size: String(row.size), qty: Math.trunc(Number(row.qty)) || 0 }));

/**
 * Admin-only stage transition (POST /api/lots/:id/stage).
 * `runAction(lot, key, { qty, sizes, note, washType })` resolves with the updated lot (incl. events) or null on failure.
 * `sizes` ([{ size, qty }]) is only sent for the "ready" action (per-size split of the pieces added to stock).
 * The transition is pre-validated with the shared rules so obvious mistakes never reach the server.
 */
export function useStageAction() {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runAction = useCallback(
    async (lot, actionKey, { qty, sizes, note, washType } = {}) => {
      const action = STAGE_ACTIONS[actionKey];
      const pieces = Math.trunc(Number(qty));
      const sizesPayload = action?.addsStock && Array.isArray(sizes) ? toSizesPayload(sizes) : null;
      try {
        applyStageAction(lot, actionKey, { qty });
        const problem = sizesPayload ? readySizesProblem(lot, sizesPayload, pieces) : null;
        if (problem) throw new Error(problem);
      } catch (err) {
        toast.error(err.message);
        return null;
      }

      setIsSubmitting(true);
      try {
        const payload = { action: actionKey };
        if (action.needsQty) payload.qty = pieces;
        if (sizesPayload) payload.sizes = sizesPayload;
        if (note && note.trim()) payload.note = note.trim();
        if (actionKey === "stitched" && washType && washType.trim()) payload.washType = washType.trim();
        const updated = await api.post(`/api/lots/${lot._id}/stage`, payload);
        clearLotCaches();
        if (action.addsStock) clearStockCaches();
        const lotNumber = updated.lotNumber || "Invoice";
        toast.success(
          action.addsStock
            ? `${lotNumber} ready · +${updated.readyQty ?? pieces} pieces added to stock`
            : `${lotNumber}: ${action.label} saved`
        );
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
