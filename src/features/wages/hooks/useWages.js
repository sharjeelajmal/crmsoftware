"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { saveBlob } from "@/features/backup/utils";
import { DEFAULT_WAGE_PERIOD, EMPTY_RANGE, isCompleteRange, wagesFileName, wagesUrl } from "../utils";

/** Wages report for a period (+ optional worker), the period state and the CSV download. */
export function useWages() {
  const toast = useToast();
  const [filter, setFilter] = useState(DEFAULT_WAGE_PERIOD);
  const [appliedRange, setAppliedRange] = useState(EMPTY_RANGE);
  const [workerId, setWorkerId] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const rangeReady = filter !== "custom" || isCompleteRange(appliedRange);
  const { data, isLoading, isFetching, error, reload } = useAsyncData(
    () => api.get(wagesUrl(filter, appliedRange, { workerId })),
    [filter, appliedRange, workerId],
    { enabled: rangeReady, cacheKey: `wages:${filter}:${workerId}:${JSON.stringify(appliedRange)}` }
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
      // CSV blob, not JSON: one of the few places a direct fetch is used.
      const response = await fetch(wagesUrl(filter, appliedRange, { workerId, csv: true }), { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || body?.message || "Could not download the wages report.");
      }
      saveBlob(await response.blob(), wagesFileName(filter));
      toast.success("Wages report downloaded");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  }, [filter, appliedRange, workerId, toast]);

  /** POST /api/wage-adjustments — leave sends days + rate, every other type an amount. */
  const addAdjustment = useCallback(
    async (form) => {
      setIsSaving(true);
      try {
        const base = {
          workerId: form.workerId,
          type: form.type,
          date: form.date,
          note: String(form.note || "").trim(),
        };
        const payload =
          form.type === "leave"
            ? { ...base, days: Number(form.days), rate: Number(form.rate) || 0 }
            : { ...base, amount: Number(form.amount) };
        await api.post("/api/wage-adjustments", payload);
        clearAsyncDataCache("wages:");
        toast.success(form.type === "leave" ? "Leave recorded" : "Entry recorded");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [reload, toast]
  );

  const deleteAdjustment = useCallback(
    async (id) => {
      try {
        await api.delete(`/api/wage-adjustments/${id}`);
        clearAsyncDataCache("wages:");
        toast.success("Entry deleted");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  return {
    report: data,
    addAdjustment,
    deleteAdjustment,
    isSaving,
    isLoading,
    isFetching,
    filter,
    appliedRange,
    workerId,
    selectPeriod,
    applyRange,
    setWorkerId,
    reload,
    downloadCsv,
    isDownloading,
  };
}
