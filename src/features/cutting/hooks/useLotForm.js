"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData, clearAsyncDataCache } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { EMPTY_LOT_FORM, formFromLot, initialSizeRows, toLotPayload, totalPieces, validateLotInput } from "../utils";

const asList = (value) => (Array.isArray(value) ? value : []);

// Every cached list that shows lot data (and the fabric khata, which counts the fabric used) must be refreshed.
const invalidateLotCaches = () => {
  clearAsyncDataCache("my-lots");
  clearAsyncDataCache("lots");
  clearAsyncDataCache("lot:");
  clearAsyncDataCache("fabric");
};

/**
 * State and submit logic of the cutting entry form.
 * Pass `lot` to edit an existing lot (PUT), omit it to create a new one (POST).
 * `onSaved(lot)` runs after a successful save.
 */
export function useLotForm({ lot = null, onSaved } = {}) {
  const toast = useToast();
  const [form, setForm] = useState(() => (lot ? formFromLot(lot) : EMPTY_LOT_FORM));
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: products,
    isLoading: productsLoading,
    error,
  } = useAsyncData(async () => asList(await api.get("/api/products")), [], { initialData: [], cacheKey: "products" });

  useEffect(() => {
    if (error) toast.error(errorMessage(error, "Could not load articles"));
  }, [error, toast]);

  const productOptions = useMemo(
    () => (products || []).map((product) => ({ value: product._id, label: product.name })),
    [products]
  );
  const product = useMemo(
    () => (products || []).find((p) => p._id === form.productId) || null,
    [products, form.productId]
  );

  const setField = useCallback((name, value) => setForm((prev) => ({ ...prev, [name]: value })), []);

  // Choosing an article resets the size rows to that article's sizes (only while nothing was typed yet).
  const selectProduct = useCallback(
    (productId) => {
      const chosen = (products || []).find((p) => p._id === productId);
      setForm((prev) => {
        const untouched = totalPieces(prev.sizes) === 0;
        return { ...prev, productId, sizes: untouched ? initialSizeRows(chosen) : prev.sizes };
      });
    },
    [products]
  );

  const setSizes = useCallback((sizes) => setForm((prev) => ({ ...prev, sizes })), []);

  const total = totalPieces(form.sizes);

  const submit = useCallback(async () => {
    const problem = validateLotInput(form);
    if (problem) {
      toast.info(problem);
      return false;
    }
    setIsSaving(true);
    try {
      const payload = toLotPayload(form);
      const saved = lot ? await api.put(`/api/lots/${lot._id}`, payload) : await api.post("/api/lots", payload);
      invalidateLotCaches();
      const pass = saved.gatePasses?.find((p) => p.type === "cutting");
      toast.success(
        `${saved.lotNumber || lot?.lotNumber || "Invoice"} ${lot ? "updated" : "saved"}${pass ? ` · gate pass ${pass.number}` : ""}`
      );
      onSaved?.(saved);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [form, lot, onSaved, toast]);

  return {
    form,
    setField,
    setSizes,
    selectProduct,
    product,
    productOptions,
    productsLoading,
    total,
    isSaving,
    isEditing: Boolean(lot),
    submit,
  };
}
