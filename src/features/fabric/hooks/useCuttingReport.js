"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { reportUrl, todayValue } from "../utils";

/** The daily cutting report for `day` ("yyyy-MM-dd", default today); admin can narrow it to one cutting master. */
export function useCuttingReport(initialDay = "") {
  const toast = useToast();
  const [day, setDay] = useState(initialDay || todayValue());
  const [holderId, setHolderId] = useState("");
  const url = reportUrl({ day, holderId });

  const { data, isLoading, isFetching, error } = useAsyncData(() => api.get(url), [url], {
    initialData: null,
    enabled: Boolean(day),
    cacheKey: `fabric-report:${url}`,
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  return { report: data, day, setDay, holderId, setHolderId, isLoading, isFetching };
}

export default useCuttingReport;
