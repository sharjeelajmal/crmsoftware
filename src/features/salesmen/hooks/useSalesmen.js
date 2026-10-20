"use client";

import { useCallback } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";

/** Loads the salesmen list and exposes the page mutations. Each mutation resolves to true on success. */
export function useSalesmen() {
  const toast = useToast();

  const { data, isLoading, reload } = useAsyncData(
    async () => {
      try {
        const salesmen = await api.get("/api/salesmen");
        return Array.isArray(salesmen) ? salesmen : [];
      } catch (err) {
        toast.error(errorMessage(err));
        return [];
      }
    },
    [],
    { initialData: [], cacheKey: "salesmen" }
  );

  const createSalesman = useCallback(
    async (salesman) => {
      try {
        await api.post("/api/salesmen", salesman);
        toast.success("Salesman added successfully!");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  const deleteSalesman = useCallback(
    async (id) => {
      try {
        await api.delete(`/api/salesmen/${id}`);
        toast.success("Salesman deleted.");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  /** Assigns an existing invoice to a salesman (POST /api/sales/link). */
  const linkSale = useCallback(
    async (invoiceNumber, salesmanId) => {
      try {
        await api.post("/api/sales/link", { invoiceNumber, salesmanId });
        toast.success("Sale linked successfully!");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  return { salesmen: data ?? [], isLoading, reload, createSalesman, deleteSalesman, linkSale };
}

/** Sales history of one salesman (GET /api/sales?salesmanId=). */
export function useSalesmanSales(salesmanId) {
  const toast = useToast();

  const { data, isLoading } = useAsyncData(
    async () => {
      try {
        const sales = await api.get(`/api/sales?salesmanId=${salesmanId}`);
        return Array.isArray(sales) ? sales : [];
      } catch (err) {
        toast.error(errorMessage(err));
        return [];
      }
    },
    [salesmanId],
    { initialData: [], cacheKey: `salesman-sales:${salesmanId}` }
  );

  return { sales: data ?? [], isLoading };
}
