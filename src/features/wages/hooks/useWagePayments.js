"use client";

import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { formatMoney } from "@/lib/format";
import { periodParams } from "../utils";

const ids = (entries) => entries.map((entry) => String(entry._id));

/**
 * Paying work (admin): `pay(entries)` pays chosen work now, `unpay(entries)` marks it unpaid again, `settle(row,
 * filter, range)` pays a worker the rest of a wage period, `removePayment(payment)` takes a payment back. Each
 * resolves to the result, or null when it failed (the error is shown).
 */
export function useWagePayments() {
  const toast = useToast();
  const [isPaying, setIsPaying] = useState(false);

  const run = useCallback(
    async (request, message) => {
      setIsPaying(true);
      try {
        const result = await request();
        // wages, the invoice's work lists and the dashboard all show paid / to pay
        clearAsyncDataCache("wages:");
        clearAsyncDataCache("work-entries:");
        clearAsyncDataCache("factory-dashboard");
        toast.success(message(result));
        return result ?? true;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setIsPaying(false);
      }
    },
    [toast]
  );

  const pay = useCallback(
    (entries) =>
      run(
        () => api.post("/api/wage-payments", { entryIds: ids(entries) }),
        (payments) => {
          const amount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const names = payments.map((p) => p.workerName).join(", ");
          return `Paid ${formatMoney(amount)} · ${names}`;
        }
      ),
    [run]
  );

  const unpay = useCallback(
    (entries) =>
      run(
        () => api.post("/api/wage-payments/undo", { entryIds: ids(entries) }),
        () => "Marked unpaid"
      ),
    [run]
  );

  const settle = useCallback(
    (row, filter, range) =>
      run(
        () => api.post("/api/wage-payments/settle", { workerId: row.workerId, ...periodParams(filter, range) }),
        (payment) => `${row.workerName} paid ${formatMoney(payment.amount)} — the rest of the period`
      ),
    [run]
  );

  const removePayment = useCallback(
    (payment) =>
      run(
        () => api.delete(`/api/wage-payments/${payment._id}`),
        () => "Payment removed — that work is unpaid again"
      ),
    [run]
  );

  return { pay, unpay, settle, removePayment, isPaying };
}

export default useWagePayments;
