"use client";

import { useCallback } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useToast } from "@/components/ui/ToastProvider";
import { openingBalanceForTotal } from "../utils";

/**
 * Sets a customer's total balance (used by the customers and recovery pages).
 *
 * - Registered customer: move the opening balance so the total matches (PUT /api/customers/:id).
 * - Normal (walk-in) customer: register them with an opening balance that makes the total match
 *   (POST /api/customers). This is the business rule the owner chose over zero-value adjustment sales.
 *
 *   const updateBalance = useBalanceUpdate(reload);
 *   await updateBalance(customer, newTotalBalance);   // resolves true on success
 */
export function useBalanceUpdate(onSaved) {
  const toast = useToast();

  return useCallback(
    async (customer, newTotalBalance) => {
      try {
        if (customer.isNormal) {
          await api.post("/api/customers", {
            name: customer.name,
            phone: customer.phone,
            city: customer.city || "N/A",
            openingBalance: newTotalBalance - (customer.totalBalance || 0),
          });
        } else {
          await api.put(`/api/customers/${customer._id}`, {
            openingBalance: openingBalanceForTotal(customer, newTotalBalance),
          });
        }
        toast.success("Balance updated");
        await onSaved?.();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [onSaved, toast]
  );
}
