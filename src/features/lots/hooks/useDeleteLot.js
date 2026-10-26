"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

/** Admin-only delete of a lot at the cutting stage. `deleteLot(id)` resolves true on success. */
export function useDeleteLot() {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteLot = useCallback(
    async (lotId) => {
      setIsDeleting(true);
      try {
        await api.delete(`/api/lots/${lotId}`);
        // Lists, summary and the lot's own cache entry are all stale now.
        clearAsyncDataCache("lots");
        clearAsyncDataCache("my-lots");
        clearAsyncDataCache(`lot:${lotId}`);
        clearAsyncDataCache("fabric"); // the deleted entry no longer uses fabric
        toast.success("Lot deleted");
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
