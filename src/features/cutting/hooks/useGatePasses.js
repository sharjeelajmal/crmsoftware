"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Gate passes of one lot (owner or admin) and the admin "issue" action.
 * `refreshKey` (e.g. the lot's updatedAt) reloads the list after stage changes / partial passes.
 */
export function useGatePasses(lotId, refreshKey) {
  const toast = useToast();
  const [isIssuing, setIsIssuing] = useState(false);
  const { data, isLoading, error, reload } = useAsyncData(
    () => api.get(`/api/lots/${lotId}/gate-passes`),
    [lotId, refreshKey],
    {
      enabled: Boolean(lotId),
      initialData: [],
      cacheKey: `gate-passes:${lotId}`,
    }
  );

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const issue = useCallback(
    async (type, washType = "") => {
      setIsIssuing(true);
      try {
        const pass = await api.post(`/api/lots/${lotId}/gate-passes`, { type, washType });
        toast.success(`${pass.number} issued`);
        await reload();
        return pass;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setIsIssuing(false);
      }
    },
    [lotId, reload, toast]
  );

  return { passes: Array.isArray(data) ? data : [], isLoading, isIssuing, issue, reload };
}
