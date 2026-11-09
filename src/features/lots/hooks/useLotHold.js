"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useToast } from "@/components/ui/ToastProvider";
import { clearLotCaches } from "./useStageAction";

/**
 * Admin stop / resume of an invoice at any stage (POST / DELETE /api/lots/:id/hold).
 * `stop(lot, reason)` and `resume(lot)` resolve to the updated invoice, or null when it failed.
 */
export function useLotHold() {
  const toast = useToast();
  const [isWorking, setIsWorking] = useState(false);

  const run = useCallback(
    async (request, message) => {
      setIsWorking(true);
      try {
        const updated = await request();
        clearLotCaches();
        toast.success(message(updated));
        return updated;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setIsWorking(false);
      }
    },
    [toast]
  );

  const stop = useCallback(
    (lot, reason) =>
      run(
        () => api.post(`/api/lots/${lot._id}/hold`, { reason: String(reason || "").trim() }),
        (updated) => `${updated.lotNumber} stopped`
      ),
    [run]
  );

  const resume = useCallback(
    (lot) =>
      run(
        () => api.delete(`/api/lots/${lot._id}/hold`),
        (updated) => `${updated.lotNumber} resumed`
      ),
    [run]
  );

  return { stop, resume, isWorking };
}

export default useLotHold;
