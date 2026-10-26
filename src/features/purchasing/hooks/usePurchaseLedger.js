"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { paymentProblem } from "@/constants/purchasingLedger";
import { ledgerUrl, toPaymentPayload } from "../utils";

const EMPTY = { opening: 0, rows: [], totals: { purchases: 0, payments: 0, closing: 0 }, balances: [] };

/** Vendor khata for the chosen vendor ("" = all) and day range, plus recording / deleting payments. */
export function usePurchaseLedger({ enabled = true } = {}) {
  const toast = useToast();
  const [vendorId, setVendorId] = useState("");
  const [range, setRange] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const url = ledgerUrl({ vendorId, range });

  const { data, isLoading, isFetching, error, reload } = useAsyncData(() => api.get(url), [url], {
    initialData: EMPTY,
    enabled,
    cacheKey: `purchase-ledger:${url}`,
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const recordPayment = useCallback(
    async (form) => {
      const problem = paymentProblem(form);
      if (problem) {
        toast.info(problem);
        return false;
      }
      setIsSaving(true);
      try {
        await api.post("/api/vendor-payments", toPaymentPayload(form));
        toast.success("Payment recorded");
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

  const deletePayment = useCallback(
    async (id) => {
      try {
        await api.delete(`/api/vendor-payments/${id}`);
        toast.success("Payment deleted");
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
    ledger: data ?? EMPTY,
    vendorId,
    setVendorId,
    range,
    setRange,
    isLoading,
    isFetching,
    isSaving,
    recordPayment,
    deletePayment,
    reload,
  };
}

export default usePurchaseLedger;
