"use client";

import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";

/** Production stock movements of one product (newest first) — GET /api/stock-movements?productId=. */
export function useStockMovements(productId) {
  const { data, isLoading, isFetching, error, reload } = useAsyncData(
    () => api.get(`/api/stock-movements?productId=${encodeURIComponent(productId)}`),
    [productId],
    { enabled: Boolean(productId), initialData: [], cacheKey: `stock-movements:${productId}` }
  );

  return { movements: Array.isArray(data) ? data : [], isLoading, isFetching, error, reload };
}
