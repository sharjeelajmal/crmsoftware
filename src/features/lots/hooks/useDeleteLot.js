"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { clearStockCaches } from "./useStageAction";

/**
 * Admin-only delete of an invoice at any stage (not once pieces were dispatched). Its gate passes, history and work
 * entries go with it and pieces in stock come back out. `deleteLot(lot)` resolves true on success.
 */
export function useDeleteLot() {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteLot = useCallback(
    async (lot) => {
      const lotId = lot._id;
      setIsDeleting(true);
      try {
        const removed = await api.delete(`/api/lots/${lotId}`);
        // Lists, summary and the lot's own cache entry are all stale now.
        clearAsyncDataCache("lots");
        clearAsyncDataCache("my-lots");
        clearAsyncDataCache(`lot:${lotId}`);
        clearAsyncDataCache("fabric"); // the deleted entry no longer uses fabric
        clearAsyncDataCache("wages:");
        clearAsyncDataCache(`work-entries:${lotId}`);
        clearAsyncDataCache(`gate-passes:${lotId}`);
        if (removed?.stockReturned) clearStockCaches();
        const parts = [
          removed?.stockReturned ? `-${removed.stockReturned} pcs from stock` : "",
          removed?.workEntries
            ? `${removed.workEntries} work ${removed.workEntries === 1 ? "entry" : "entries"} removed`
            : "",
        ].filter(Boolean);
        toast.success(`${lot.lotNumber} deleted${parts.length ? ` · ${parts.join(" · ")}` : ""}`);
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [toast]
  );

  return { deleteLot, isDeleting };
}
