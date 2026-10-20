"use client";

import { useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

const asList = (value) => (Array.isArray(value) ? value : []);

/** Admin view: every lot (optionally one stage) plus the summary numbers for the stat cards. */
export function useLots(stage = "") {
  const toast = useToast();
  const lotsQuery = useAsyncData(
    async () => asList(await api.get(`/api/lots${stage ? `?stage=${encodeURIComponent(stage)}` : ""}`)),
    [stage],
    { initialData: [], cacheKey: `lots:${stage}` }
  );
  const summaryQuery = useAsyncData(() => api.get("/api/lots/summary"), [], { cacheKey: "lots-summary" });

  const error = lotsQuery.error || summaryQuery.error;
  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  return {
    lots: lotsQuery.data || [],
    summary: summaryQuery.data,
    isLoading: lotsQuery.isLoading,
    isFetching: lotsQuery.isFetching,
  };
}
