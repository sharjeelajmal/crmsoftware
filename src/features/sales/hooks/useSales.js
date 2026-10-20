"use client";

import { useCallback, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { customerKey, saleErrorMessage } from "../utils";

const EMPTY = { sales: [], customerKeys: new Set() };

/**
 * Data for the sales history page: the sales list, which customers are already
 * registered (for the "Add to Customers" button) and the update/delete mutations.
 */
export function useSales() {
  const toast = useToast();

  const { data, isLoading, error, reload, setData } = useAsyncData(
    async () => {
      const [sales, customers] = await Promise.all([api.get("/api/sales"), api.get("/api/customers")]);
      const registered = Array.isArray(customers) ? customers : [];
      return {
        sales: Array.isArray(sales) ? sales : [],
        customerKeys: new Set(registered.map((c) => customerKey(c.name, c.phone))),
      };
    },
    [],
    { cacheKey: "sales" }
  );

  useEffect(() => {
    if (error) toast.error(saleErrorMessage(error, "Failed to load sales"));
  }, [error, toast]);

  const { sales, customerKeys } = data ?? EMPTY;

  const isCustomerRegistered = useCallback(
    (sale) => customerKeys.has(customerKey(sale.customerName, sale.customerPhone)),
    [customerKeys]
  );

  const addCustomer = useCallback(
    async (sale) => {
      const key = customerKey(sale.customerName, sale.customerPhone);
      if (customerKeys.has(key)) return;
      try {
        await api.post("/api/customers", {
          name: sale.customerName,
          phone: sale.customerPhone,
          city: "N/A",
          openingBalance: 0,
        });
        setData((prev) => ({ ...(prev ?? EMPTY), customerKeys: new Set(prev?.customerKeys).add(key) }));
        toast.success("Customer added");
      } catch (err) {
        toast.error(saleErrorMessage(err, "Failed to add customer"));
      }
    },
    [customerKeys, setData, toast]
  );

  const updateSale = useCallback(
    async (sale) => {
      try {
        await api.put(`/api/sales/${sale._id}`, sale);
        toast.success("Invoice updated");
        await reload();
        return true;
      } catch (err) {
        toast.error(saleErrorMessage(err, "Failed to update sale"));
        return false;
      }
    },
    [reload, toast]
  );

  const deleteSale = useCallback(
    async (saleId) => {
      try {
        await api.delete(`/api/sales/${saleId}`);
        toast.success("Sale deleted");
        await reload();
        return true;
      } catch (err) {
        toast.error(saleErrorMessage(err, "Failed to delete sale"));
        return false;
      }
    },
    [reload, toast]
  );

  return { sales, isLoading, isCustomerRegistered, addCustomer, updateSale, deleteSale, reload };
}
