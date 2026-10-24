"use client";

import { useCallback, useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

/** Worker list (admin) and its mutations. Each mutation resolves true on success. */
export function useWorkers() {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(() => api.get("/api/workers"), [], {
    initialData: [],
    cacheKey: "workers",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const run = useCallback(
    async (action, successMessage) => {
      try {
        await action();
        clearAsyncDataCache("wages:");
        toast.success(successMessage);
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  const saveWorker = useCallback(
    (form) => {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        type: form.type,
        dailyRate: Number(form.dailyRate) || 0,
        note: form.note.trim(),
      };
      return form._id
        ? run(() => api.put(`/api/workers/${form._id}`, payload), "Worker updated")
        : run(() => api.post("/api/workers", payload), "Worker added");
    },
    [run]
  );

  const setActive = useCallback(
    (worker, active) =>
      run(() => api.put(`/api/workers/${worker._id}`, { active }), active ? "Worker activated" : "Worker deactivated"),
    [run]
  );

  const deleteWorker = useCallback((id) => run(() => api.delete(`/api/workers/${id}`), "Worker deleted"), [run]);

  return { workers: Array.isArray(data) ? data : [], isLoading, reload, saveWorker, setActive, deleteWorker };
}
