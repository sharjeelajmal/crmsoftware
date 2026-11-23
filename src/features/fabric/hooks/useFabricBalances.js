"use client";

import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";

/**
 * The signed-in user's fabric in hand (all-time balance per fabric), for the cutting form and the My Lots page.
 * Quiet on errors: the balance is a help there, never a blocker. `admin` / `holders` (the cutting masters) let the
 * cutting form's "New fabric" receive fabric like the fabric khata does.
 */
export function useFabricBalances() {
  const { data, isLoading, reload } = useAsyncData(() => api.get("/api/fabric"), [], {
    initialData: null,
    cacheKey: "fabric:/api/fabric",
  });
  return {
    balances: Array.isArray(data?.balances) ? data.balances : [],
    totals: Array.isArray(data?.totals) ? data.totals : [],
    admin: Boolean(data?.admin),
    holders: Array.isArray(data?.holders) ? data.holders : [],
    isLoading,
    reload,
  };
}

export default useFabricBalances;
