"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { formatMoney } from "@/lib/format";
import { cutRefOf, toKhataEntryPayload } from "../utils";

/** Everything that shows khata work or wages is stale after a change. */
export const clearKhataCaches = () => {
  clearAsyncDataCache("khata-");
  clearAsyncDataCache("wages:");
  clearAsyncDataCache("work-entries:");
  clearAsyncDataCache("factory-dashboard");
};

/** Runs a khata change with a toast; resolves to its result, or null when it failed (the error is shown). */
function useKhataAction() {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const run = useCallback(
    async (request, message) => {
      setIsSaving(true);
      try {
        const result = await request();
        clearKhataCaches();
        toast.success(typeof message === "function" ? message(result) : message);
        return result ?? true;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [toast]
  );
  return { run, isSaving };
}

const useLoadError = (error) => {
  const toast = useToast();
  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);
};

/** The khata's worker boxes: every worker with what is unpaid, all-time wages and the last lock. */
export function useKhataWorkers() {
  const { data, isLoading, error, reload } = useAsyncData(() => api.get("/api/khata/workers"), [], {
    initialData: [],
    cacheKey: "khata-workers",
  });
  useLoadError(error);
  return { workers: Array.isArray(data) ? data : [], isLoading, reload };
}

/** The khata's cuts (newest first, with their work so far) and adding, editing and deleting one. */
export function useKhataCuts() {
  const { data, isLoading, error, reload } = useAsyncData(() => api.get("/api/khata/cuts"), [], {
    initialData: [],
    cacheKey: "khata-cuts",
  });
  useLoadError(error);
  const { run, isSaving } = useKhataAction();

  const saveCut = useCallback(
    async (form) => {
      const body = {
        cutNumber: form.cutNumber.trim(),
        article: form.article.trim(),
        pieces: Math.trunc(Number(form.pieces)) || 0,
        date: form.date,
        note: form.note.trim(),
      };
      const saved = await run(
        () => (form._id ? api.put(`/api/khata/cuts/${form._id}`, body) : api.post("/api/khata/cuts", body)),
        (cut) => `Cut ${cut.cutNumber} ${form._id ? "updated" : "added"}`
      );
      if (saved) await reload();
      return saved;
    },
    [run, reload]
  );

  const deleteCut = useCallback(
    async (cut) => {
      const done = await run(() => api.delete(`/api/khata/cuts/${cut._id}`), `Cut ${cut.cutNumber} deleted`);
      if (done) await reload();
      return done;
    },
    [run, reload]
  );

  return { cuts: Array.isArray(data) ? data : [], isLoading, isSaving, reload, saveCut, deleteCut };
}

/** One worker's khata (work, payments, totals, advance left) and every change made from it. */
export function useWorkerKhata(workerId) {
  const { data, isLoading, error, reload } = useAsyncData(() => api.get(`/api/khata/workers/${workerId}`), [workerId], {
    enabled: Boolean(workerId),
    cacheKey: `khata-worker:${workerId}`,
  });
  useLoadError(error);
  const { run, isSaving } = useKhataAction();
  const after = useCallback(
    async (result) => {
      if (result) await reload();
      return result;
    },
    [reload]
  );

  const addEntry = useCallback(
    (form) =>
      run(
        () => api.post("/api/khata/entries", toKhataEntryPayload(form)),
        (entry) => `${entry.operationName} · ${entry.pieces} pcs · ${formatMoney(entry.amount)} added`
      ).then(after),
    [run, after]
  );
  // `cash`: what was handed over (undefined: all that is due) — less or more stays as his baqaya
  const lock = useCallback(
    (upTo, note, advanceCut = 0, cash) =>
      run(
        () =>
          api.post(`/api/khata/workers/${workerId}/lock`, {
            upTo,
            note,
            ...(advanceCut > 0 ? { advanceCut } : {}),
            ...(cash !== undefined ? { cash } : {}),
          }),
        (payment) =>
          [
            `Locked · ${formatMoney(payment.amount)} given`,
            payment.advanceCut > 0 ? `${formatMoney(payment.advanceCut)} advance cut` : "",
            payment.balanceChange > 0 ? `${formatMoney(payment.balanceChange)} still to give (baqaya)` : "",
            payment.extraAdvance > 0 ? `${formatMoney(payment.extraAdvance)} extra went to his advance` : "",
          ]
            .filter(Boolean)
            .join(", ")
      ).then(after),
    [run, after, workerId]
  );
  const addBalance = useCallback(
    (form) =>
      run(
        () =>
          api.post(`/api/khata/workers/${workerId}/balances`, {
            owedBy: form.owedBy,
            amount: Number(form.amount) || 0,
            date: form.date,
            note: String(form.note || "").trim(),
          }),
        (saved) => (saved.kind === "advance" ? "Added to his advance" : "Added to his baqaya")
      ).then(after),
    [run, after, workerId]
  );
  const removeBalance = useCallback(
    (balance) => run(() => api.delete(`/api/khata/balances/${balance._id}`), "Old balance removed").then(after),
    [run, after]
  );
  const removePayment = useCallback(
    (payment) =>
      run(() => api.delete(`/api/wage-payments/${payment._id}`), "Payment taken back — that work is unpaid again").then(
        after
      ),
    [run, after]
  );
  const removeEntry = useCallback(
    (entry) => run(() => api.delete(`/api/work-entries/${entry._id}`), "Work entry removed").then(after),
    [run, after]
  );
  const payEntry = useCallback(
    (entry) =>
      run(
        () => api.post("/api/wage-payments", { entryIds: [String(entry._id)] }),
        `Paid ${formatMoney(entry.amount)}`
      ).then(after),
    [run, after]
  );
  const unpayEntry = useCallback(
    (entry) =>
      run(() => api.post("/api/wage-payments/undo", { entryIds: [String(entry._id)] }), "Marked unpaid").then(after),
    [run, after]
  );

  return {
    khata: data ?? null,
    isLoading,
    isSaving,
    reload,
    addEntry,
    lock,
    addBalance,
    removeBalance,
    removePayment,
    removeEntry,
    payEntry,
    unpayEntry,
  };
}

/** One cut with all its work, and adding work to it. */
export function useCut(cutId) {
  const { data, isLoading, error, reload } = useAsyncData(() => api.get(`/api/khata/cuts/${cutId}`), [cutId], {
    enabled: Boolean(cutId),
    cacheKey: `khata-cut:${cutId}`,
  });
  useLoadError(error);
  const { run, isSaving } = useKhataAction();
  const addEntry = useCallback(
    async (form) => {
      const entry = await run(
        () => api.post("/api/khata/entries", toKhataEntryPayload(form)),
        (saved) => `${saved.workerName} · ${saved.operationName} · ${saved.pieces} pcs added`
      );
      if (entry) await reload();
      return entry;
    },
    [run, reload]
  );
  return { cut: data ?? null, isLoading, isSaving, reload, addEntry };
}

/**
 * The work already entered on a cut or invoice (a cut picker value, "cut:<id>" / "lot:<id>"), every worker's — what
 * the entry form checks each operation's pieces against. `isChecking` while it (re)loads.
 */
export function useRefWork(value) {
  const ref = cutRefOf(value);
  const query = ref.cutId ? `cutId=${ref.cutId}` : ref.lotId ? `lotId=${ref.lotId}` : "";
  const { data, isFetching, reload } = useAsyncData(() => api.get(`/api/work-entries?${query}`), [query], {
    initialData: [],
    enabled: Boolean(query),
    cacheKey: query ? `khata-ref:${query}` : undefined,
  });
  return {
    entries: query && Array.isArray(data) ? data : [],
    isChecking: Boolean(query) && isFetching,
    reload,
  };
}

/** What the cut picker offers: the khata's cuts, then the invoices. */
export function useCutChoices() {
  const { data, isLoading } = useAsyncData(
    async () => {
      const [cuts, lots] = await Promise.all([api.get("/api/khata/cuts"), api.get("/api/lots")]);
      return { cuts: Array.isArray(cuts) ? cuts : [], lots: Array.isArray(lots) ? lots : [] };
    },
    [],
    { initialData: { cuts: [], lots: [] }, cacheKey: "khata-cut-choices" }
  );
  return { cuts: data?.cuts ?? [], lots: data?.lots ?? [], isLoading };
}
