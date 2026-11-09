"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { STAGE_LABELS } from "@/constants/lots";
import { clearLotCaches, clearStockCaches } from "./useStageAction";

/**
 * Admin-only "Reverse" (POST /api/lots/:id/reverse): takes the invoice back one stage from wherever it is. At ready
 * the pieces go back out of stock. `reverseLot(lot, reason)` returns the updated invoice or null.
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
        clearAsyncDataCache(`gate-passes:${lot._id}`);
        if (lot.stage === "ready") {
          clearStockCaches();
          const pieces = Number(lot.readyQty) || 0;
          toast.success(`${updated.lotNumber || "Invoice"} reversed · -${pieces} pieces taken back from stock`);
        } else {
          toast.success(`${updated.lotNumber || "Invoice"} back to ${STAGE_LABELS[updated.stage] ?? updated.stage}`);
        }
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
