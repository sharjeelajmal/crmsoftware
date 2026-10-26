"use client";

import { useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

/** The attendance register of one month ("yyyy-MM"): every worker × every day with the counts and the pay cut. */
export function useAttendanceMonth(month, { enabled = true } = {}) {
  const toast = useToast();
  const { data, isLoading, isFetching, error } = useAsyncData(
    () => api.get(`/api/attendance/month?month=${month}`),
    [month],
    { initialData: null, enabled: enabled && Boolean(month), cacheKey: `attendance-month:${month}` }
  );

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  return { register: data?.month === month ? data : null, isLoading, isFetching };
}

export default useAttendanceMonth;
