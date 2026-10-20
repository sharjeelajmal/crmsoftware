"use client";

import { useCallback, useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { useBalanceUpdate } from "./useBalanceUpdate";

const EMPTY = [];
const asList = (value) => (Array.isArray(value) ? value : EMPTY);

/** Both customer lists (registered + walk-in) and every mutation the customers page needs. */
export function useCustomers() {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(
    () => Promise.all([api.get("/api/customers"), api.get("/api/customers?view=normal")]),
    [],
    { cacheKey: "customers" }
  );

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const registered = asList(data?.[0]);
  const normal = asList(data?.[1]);

  /** Registers a customer; returns true when saved so the caller can close the popup. */
  const addCustomer = useCallback(
    async (customer) => {
      if (!customer.name?.trim() || !customer.phone?.trim()) {
        toast.info("Name and Phone are required.");
        return false;
      }
      try {
        await api.post("/api/customers", { ...customer, openingBalance: parseFloat(customer.openingBalance) || 0 });
        toast.success("Customer registered");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  const deleteCustomer = useCallback(
    async (customerId) => {
      try {
        await api.delete(`/api/customers/${customerId}`);
        toast.success("Customer removed");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  const updateBalance = useBalanceUpdate(reload);

  return { registered, normal, isLoading, reload, addCustomer, deleteCustomer, updateBalance };
}

/** Sales history of one customer (ViewSalesPopup). */
export function useCustomerSales(customerName) {
  const toast = useToast();
  const { data, isLoading, error } = useAsyncData(
    () => api.get(`/api/sales?customerName=${encodeURIComponent(customerName)}`),
    [customerName],
    { enabled: Boolean(customerName), cacheKey: `customer-sales:${customerName}` }
  );

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  return { sales: asList(data), isLoading };
}
