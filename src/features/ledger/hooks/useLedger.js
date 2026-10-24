"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { filterLedgerEntries, ledgerTotals } from "@/constants/ledger";
import { saveBlob } from "@/features/backup/utils";
import {
  DEFAULT_LEDGER_FILTER,
  EMPTY_RANGE,
  isCompleteRange,
  ledgerFileName,
  ledgerUrl,
  toLedgerPayload,
} from "../utils";

const EMPTY = { entries: [], totals: ledgerTotals([]) };

/**
 * Register entries for the selected period + type (GET /api/ledger), the free-text search
 * (client-side, so typing never refetches), every mutation and the CSV download.
 */
export function useLedger() {
  const toast = useToast();
  const [filter, setFilter] = useState(DEFAULT_LEDGER_FILTER);
  const [appliedRange, setAppliedRange] = useState(EMPTY_RANGE);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const rangeReady = filter !== "custom" || isCompleteRange(appliedRange);
  const { data, isLoading, isFetching, error, reload } = useAsyncData(
    () => api.get(ledgerUrl(filter, appliedRange, { type })),
    [filter, appliedRange, type],
    { enabled: rangeReady, initialData: EMPTY, cacheKey: `ledger:${filter}:${type}:${JSON.stringify(appliedRange)}` }
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

  // Runs a mutation, reports the outcome and refreshes every cached ledger view. Resolves true on success.
  const mutate = useCallback(
    async (action, successMessage) => {
      try {
        await action();
        clearAsyncDataCache("ledger:");
        toast.success(successMessage);
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  const saveEntry = useCallback(
    (form) =>
      form._id
        ? mutate(() => api.put(`/api/ledger/${form._id}`, toLedgerPayload(form)), "Entry updated")
        : mutate(() => api.post("/api/ledger", toLedgerPayload(form)), "Entry recorded"),
    [mutate]
  );

  const deleteEntry = useCallback(
    (entryId) => mutate(() => api.delete(`/api/ledger/${entryId}`), "Entry deleted"),
    [mutate]
  );

  const downloadCsv = useCallback(async () => {
    setIsDownloading(true);
    try {
      // The response is a CSV blob, not JSON, so this is one of the few places a direct fetch is used.
      const response = await fetch(ledgerUrl(filter, appliedRange, { type, csv: true }), { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || body?.message || "Could not download the register.");
      }
      saveBlob(await response.blob(), ledgerFileName(filter, type));
      toast.success("Register downloaded");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  }, [filter, appliedRange, type, toast]);

  const entries = useMemo(() => filterLedgerEntries(data?.entries ?? [], { search }), [data, search]);
  const totals = useMemo(
    () => (search ? ledgerTotals(entries) : (data?.totals ?? EMPTY.totals)),
    [data, entries, search]
  );

  return {
    entries,
    totals,
    isLoading,
    isFetching,
    filter,
    appliedRange,
    type,
    search,
    selectPeriod,
    applyRange,
    setType,
    setSearch,
    saveEntry,
    deleteEntry,
    downloadCsv,
    isDownloading,
    reload,
  };
}
