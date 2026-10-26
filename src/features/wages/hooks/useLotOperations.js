"use client";

import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";

const EMPTY = { category: "", fromCard: false, operations: [], perPiece: 0 };

/** The operations to assign on a lot: its category's rate card, or every active operation (admin). */
export function useLotOperations(lotId) {
  const { data, isLoading } = useAsyncData(() => api.get(`/api/lots/${lotId}/operations`), [lotId], {
    initialData: EMPTY,
    enabled: Boolean(lotId),
    cacheKey: `lot-operations:${lotId}`,
  });
  return { ...EMPTY, ...(data ?? {}), isLoading };
}

export default useLotOperations;
