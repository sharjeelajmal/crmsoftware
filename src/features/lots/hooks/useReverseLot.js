"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useToast } from "@/components/ui/ToastProvider";
import { clearLotCaches, clearStockCaches } from "./useStageAction";

/**
 * Admin-only undo of "Ready for Sale" (POST /api/lots/:id/reverse).
 * `reverseLot(lot, reason)` takes the pieces back out of stock and returns the lot (back at packing) or null.
 */
export function useReverseLot() {
  const toast = useToast();
  const [isReversing, setIsReversing] = useState(false);

  const reverseLot = useCallback(
    async (lot, reason) => {
      const trimmed = String(reason || "").trim();
      if (!trimmed) {
        toast.info("Please enter the reason for reversing.");
        return null;
      }
      setIsReversing(true);
      try {
        const updated = await api.post(`/api/lots/${lot._id}/reverse`, { reason: trimmed });
        clearLotCaches();
        clearStockCaches();
        const pieces = Number(lot.readyQty) || 0;
        toast.success(`${updated.lotNumber || "Invoice"} reversed · -${pieces} pieces taken back from stock`);
        return updated;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setIsReversing(false);
      }
    },
    [toast]
  );

  return { reverseLot, isReversing };
}
