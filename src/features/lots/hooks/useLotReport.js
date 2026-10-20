"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { saveBlob } from "@/features/backup/utils";
import { DEFAULT_REPORT_FILTER, EMPTY_RANGE, isCompleteRange, lotReportUrl, reportFileName } from "../utils";

/**
 * Period filter + lot report data (GET /api/lots/report) and the CSV download.
 * A custom range only takes effect once applied, so the calendar's in-progress selection never fetches.
 */
export function useLotReport() {
  const toast = useToast();
  const [filter, setFilter] = useState(DEFAULT_REPORT_FILTER);
  const [appliedRange, setAppliedRange] = useState(EMPTY_RANGE);
  const [isDownloading, setIsDownloading] = useState(false);

  const rangeReady = filter !== "custom" || isCompleteRange(appliedRange);
  const { data, isLoading, isFetching, error, reload } = useAsyncData(
    () => api.get(lotReportUrl(filter, appliedRange)),
    [filter, appliedRange],
    { enabled: rangeReady, cacheKey: `lot-report:${filter}:${JSON.stringify(appliedRange)}` }
  );

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const selectPeriod = useCallback((value) => {
    setFilter(value);
    setAppliedRange(EMPTY_RANGE);
  }, []);

  const applyRange = useCallback((range) => {
    setAppliedRange(range);
    setFilter("custom");
  }, []);

  const downloadCsv = useCallback(async () => {
    setIsDownloading(true);
    try {
      // The response is a CSV blob, not JSON, so this is one of the few places a direct fetch is used.
      const response = await fetch(lotReportUrl(filter, appliedRange, { csv: true }), { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || body?.message || "Could not download the report.");
      }
      saveBlob(await response.blob(), reportFileName(filter));
      toast.success("Report downloaded");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  }, [filter, appliedRange, toast]);

  return {
    report: data,
    isLoading,
    isFetching,
    filter,
    appliedRange,
    selectPeriod,
    applyRange,
    reload,
    downloadCsv,
    isDownloading,
  };
}
