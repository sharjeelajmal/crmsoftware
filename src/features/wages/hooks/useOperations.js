"use client";

import { useCallback, useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

const EMPTY = { operations: [], perPiece: 0 };

/** Stitching operations with their per-piece rates (admin) and the mutations of the rates tab. */
export function useOperations() {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(() => api.get("/api/operations"), [], {
    initialData: EMPTY,
    cacheKey: "operations",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const run = useCallback(
    async (action, successMessage) => {
      try {
        await action();
        toast.success(successMessage);
        clearAsyncDataCache("rate-cards");
        clearAsyncDataCache("lot-operations:");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  const saveOperation = useCallback(
    (form) => {
      const payload = { name: form.name.trim(), rate: Number(form.rate), stage: form.stage };
      return form._id
        ? run(() => api.put(`/api/operations/${form._id}`, payload), "Operation updated")
        : run(() => api.post("/api/operations", payload), "Operation added");
    },
    [run]
  );

  const setActive = useCallback(
    (operation, active) =>
      run(
        () => api.put(`/api/operations/${operation._id}`, { active }),
        active ? "Operation activated" : "Operation deactivated"
      ),
    [run]
  );

  const deleteOperation = useCallback(
    (id) => run(() => api.delete(`/api/operations/${id}`), "Operation deleted"),
    [run]
  );

  return {
    operations: data?.operations ?? [],
    perPiece: data?.perPiece ?? 0,
    isLoading,
    reload,
    saveOperation,
    setActive,
    deleteOperation,
  };
}
