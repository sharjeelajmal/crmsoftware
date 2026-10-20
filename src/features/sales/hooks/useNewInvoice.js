"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { saleErrorMessage } from "../utils";

/**
 * Data for the new-invoice page: product list (for suggestions), the next free
 * invoice number and the save mutation.
 *
 * The server may assign a different invoice number when the proposed one is
 * already taken, so `saveSale` resolves with the saved document and the caller
 * should use *its* `invoiceNumber`.
 */
export function useNewInvoice() {
  const toast = useToast();
  // Set after a save so the form moves on from the number the server actually used.
  const [nextNumber, setNextNumber] = useState(null);

  const products = useAsyncData(() => api.get("/api/products"), [], { initialData: [], cacheKey: "products" });
  const latest = useAsyncData(() => api.get("/api/sales/latest"), [], { cacheKey: "latest-invoice" });

  useEffect(() => {
    if (products.error) toast.error(saleErrorMessage(products.error, "Failed to load products"));
  }, [products.error, toast]);

  useEffect(() => {
    if (latest.error) toast.error(saleErrorMessage(latest.error, "Failed to load latest invoice number"));
  }, [latest.error, toast]);

  const invoiceNumber = nextNumber ?? (Number(latest.data?.latestInvoiceNumber) || 0) + 1;

  const saveSale = useCallback(
    async (sale) => {
      try {
        return await api.post("/api/sales", sale);
      } catch (err) {
        toast.error(saleErrorMessage(err, "Failed to save the sale"));
        return null;
      }
    },
    [toast]
  );

  return {
    products: Array.isArray(products.data) ? products.data : [],
    invoiceNumber,
    setNextInvoiceNumber: setNextNumber,
    saveSale,
  };
}
