"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { dispatchProblem } from "@/constants/gatepass";
import { clearLotCaches } from "./useStageAction";

/**
 * Partial "gate pass out" from stitching to washing (POST /api/lots/:id/dispatch).
 * `dispatch(lot, { pieces, washType, note })` resolves `{ lot, pass }` or null on failure.
 */
export function useDispatchLot() {
  const toast = useToast();
  const [isDispatching, setIsDispatching] = useState(false);

  const dispatch = useCallback(
    async (lot, { pieces, washType = "", note = "" }) => {
      const problem = dispatchProblem(lot, pieces);
      if (problem) {
        toast.info(problem);
        return null;
      }
      setIsDispatching(true);
      try {
        const result = await api.post(`/api/lots/${lot._id}/dispatch`, {
          pieces: Math.trunc(Number(pieces)),
          washType: String(washType || "").trim(),
          note: String(note || "").trim(),
        });
        clearLotCaches();
        clearAsyncDataCache(`lot:${lot._id}`);
        clearAsyncDataCache(`gate-passes:${lot._id}`);
        toast.success(`${result.pass.number} · ${result.pass.pieces} pcs out to washing`);
        return result;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setIsDispatching(false);
      }
    },
    [toast]
  );

  return { dispatch, isDispatching };
}
