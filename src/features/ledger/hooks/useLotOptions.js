"use client";

import { useMemo } from "react";
import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { lotOptions } from "../utils";

/** Every lot as a dropdown option ("LOT-1001 · Article") for the optional lot link; loads once per session. */
export function useLotOptions(enabled = true) {
  const { data, isLoading } = useAsyncData(() => api.get("/api/lots"), [], {
    enabled,
    initialData: [],
    cacheKey: "ledger:lots",
  });
  const options = useMemo(() => lotOptions(Array.isArray(data) ? data : []), [data]);
  return { options, isLoading };
}
