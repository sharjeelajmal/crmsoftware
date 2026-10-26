"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { applyMarks } from "@/constants/attendance";

/**
 * The attendance sheet of one day and the marking action. A mark shows at once and is saved in the background;
 * if the save fails the sheet goes back and a toast says why. Only the newest save's answer is applied, so quick
 * taps never flicker back to an older state.
 */
export function useAttendanceDay(day) {
  const toast = useToast();
  const { data, isLoading, isFetching, error } = useAsyncData(() => api.get(`/api/attendance?day=${day}`), [day], {
    initialData: null,
    enabled: Boolean(day),
    cacheKey: `attendance:${day}`,
  });
  const [local, setLocal] = useState(null);
  const latest = useRef(0);
  const sheet = local?.day === day ? local : data?.day === day ? data : null;

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const mark = useCallback(
    async (marks) => {
      if (!sheet || marks.length === 0) return false;
      const before = sheet;
      const id = ++latest.current;
      setLocal(applyMarks(sheet, marks));
      try {
        const saved = await api.put("/api/attendance", { day, marks });
        clearAsyncDataCache(`attendance:${day}`);
        clearAsyncDataCache("attendance-month");
        clearAsyncDataCache("wages:");
        if (id === latest.current) setLocal(saved);
        return true;
      } catch (err) {
        if (id === latest.current) setLocal(before);
        toast.error(errorMessage(err));
        return false;
      }
    },
    [day, sheet, toast]
  );

  return { sheet, isLoading: isLoading || (!sheet && isFetching), isFetching, mark };
}

export default useAttendanceDay;
