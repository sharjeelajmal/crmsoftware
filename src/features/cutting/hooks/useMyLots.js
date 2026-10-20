"use client";

import { useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

const asList = (value) => (Array.isArray(value) ? value : []);

/**
 * Lots created by the signed-in user. The server already limits a cutting master to
 * their own lots; `mine=1` makes the page mean "my lots" for admins too.
 */
export function useMyLots() {
  const toast = useToast();
  const { data, isLoading, isFetching, error, reload } = useAsyncData(
    async () => asList(await api.get("/api/lots?mine=1")),
    [],
    { initialData: [], cacheKey: "my-lots" }
  );

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  return { lots: data || [], isLoading, isFetching, reload };
}
