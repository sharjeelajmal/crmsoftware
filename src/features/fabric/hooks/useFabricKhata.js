"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { receiptProblem } from "@/constants/fabric";
import { khataUrl, toReceiptPayload } from "../utils";

const EMPTY = { balances: [], totals: [], ledger: [], receipts: [], admin: false, holders: [] };

/**
 * The fabric khata: all-time balances, the day-by-day khata for the chosen fabric ("" = all) and period, and the
 * receipts — plus recording, correcting and deleting receipts. Admin can narrow everything to one cutting master.
 */
export function useFabricKhata() {
  const toast = useToast();
  const [holderId, setHolderId] = useState("");
  const [fabric, setFabric] = useState("");
  const [range, setRange] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const url = khataUrl({ holderId, fabric, range });

  const { data, isLoading, isFetching, error, reload } = useAsyncData(() => api.get(url), [url], {
    initialData: EMPTY,
    cacheKey: `fabric:${url}`,
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const refresh = useCallback(async () => {
    clearAsyncDataCache("fabric");
    await reload();
  }, [reload]);

  const saveReceipt = useCallback(
    async (form) => {
      const problem = receiptProblem(form);
      if (problem) {
        toast.info(problem);
        return false;
      }
      setIsSaving(true);
      try {
        const payload = toReceiptPayload(form);
        if (form._id) await api.put(`/api/fabric/receipts/${form._id}`, payload);
        else await api.post("/api/fabric/receipts", payload);
        toast.success(form._id ? "Receipt updated" : "Fabric received");
        await refresh();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [refresh, toast]
  );

  const deleteReceipt = useCallback(
    async (id) => {
      try {
        await api.delete(`/api/fabric/receipts/${id}`);
        toast.success("Receipt deleted");
        await refresh();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [refresh, toast]
  );

  return {
    khata: { ...EMPTY, ...(data ?? {}) },
    holderId,
    setHolderId,
    fabric,
    setFabric,
    range,
    setRange,
    isLoading,
    isFetching,
    isSaving,
    saveReceipt,
    deleteReceipt,
  };
}

export default useFabricKhata;
