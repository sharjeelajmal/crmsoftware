"use client";

import { useCallback, useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { purchaseProblem, toPurchasePayload, toVendorPayload } from "../utils";

const EMPTY = { purchases: [], vendors: [], products: [] };

const asList = (value) => (Array.isArray(value) ? value : []);

const loadPurchasing = async (dateFilter) => {
  const [purchases, vendors, products] = await Promise.all([
    api.get(`/api/purchases?filter=${dateFilter}`),
    api.get("/api/vendors"),
    api.get("/api/products"),
  ]);
  return { purchases: asList(purchases), vendors: asList(vendors), products: asList(products) };
};

/** Purchases for the selected period plus vendors/products, and every mutation of the page. */
export function usePurchasing(dateFilter) {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(() => loadPurchasing(dateFilter), [dateFilter], {
    initialData: EMPTY,
    cacheKey: `purchasing:${dateFilter}`,
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  // Runs a mutation, reports the outcome and refreshes the lists. Resolves true on success.
  const mutate = useCallback(
    async (action, successMessage) => {
      try {
        await action();
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

  /** Records a purchase; a product that tracks sizes must have a size picked. */
  const savePurchase = useCallback(
    (purchase) => {
      const problem = purchaseProblem(purchase, data.products);
      if (problem) {
        toast.info(problem);
        return Promise.resolve(false);
      }
      return mutate(() => api.post("/api/purchases", toPurchasePayload(purchase)), "Purchase recorded");
    },
    [data.products, mutate, toast]
  );

  const saveVendor = useCallback(
    (vendor) =>
      vendor._id
        ? mutate(() => api.put(`/api/vendors/${vendor._id}`, toVendorPayload(vendor)), "Vendor updated")
        : mutate(() => api.post("/api/vendors", toVendorPayload(vendor)), "Vendor added"),
    [mutate]
  );

  const deleteVendor = useCallback(
    (vendorId) => mutate(() => api.delete(`/api/vendors/${vendorId}`), "Vendor deleted"),
    [mutate]
  );

  const deletePurchase = useCallback(
    (purchaseId) => mutate(() => api.delete(`/api/purchases/${purchaseId}`), "Purchase deleted"),
    [mutate]
  );

  return { ...data, isLoading, savePurchase, saveVendor, deleteVendor, deletePurchase };
}
