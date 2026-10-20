"use client";

import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";

/** One lot with its history (`events`). Shared by the cutting portal and the admin lots pages. */
export function useLotDetail(id) {
  const { data, isLoading, isFetching, error, reload } = useAsyncData(() => api.get(`/api/lots/${id}`), [id], {
    enabled: Boolean(id),
    cacheKey: `lot:${id}`,
  });

  return { lot: data, isLoading, isFetching, error, reload };
}
