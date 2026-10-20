"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { EMPTY_RANGE, analyticsUrl, isCompleteRange } from "../utils";

/**
 * Period filter + analytics data. A custom range only takes effect once the user
 * applies it, so the calendar's in-progress selection never triggers a request.
 */
export function useAnalytics() {
  const toast = useToast();
  const [filter, setFilter] = useState("today");
  const [appliedRange, setAppliedRange] = useState(EMPTY_RANGE);

  const { data, isLoading } = useAsyncData(
    async () => {
      if (filter === "custom" && !isCompleteRange(appliedRange)) return null;
      try {
        return await api.get(analyticsUrl(filter, appliedRange));
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      }
    },
    [filter, appliedRange],
    { cacheKey: `analytics:${analyticsUrl(filter, appliedRange)}` }
  );

  const selectPeriod = useCallback((value) => {
    setFilter(value);
    setAppliedRange(EMPTY_RANGE);
  }, []);

  const applyRange = useCallback((range) => {
    setAppliedRange(range);
    setFilter("custom");
  }, []);

  return { data, isLoading, filter, appliedRange, selectPeriod, applyRange };
}
