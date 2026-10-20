"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { CUSTOM_FILTER, DEFAULT_FILTER, EMPTY_RANGE, expensesUrl, isCompleteRange, toExpensePayload } from "../utils";

const EMPTY = { expenses: [], totalAmount: 0, categories: [] };

const loadExpenses = async (dateFilter, range) => {
  const [result, categories] = await Promise.all([
    api.get(expensesUrl(dateFilter, range)),
    api.get("/api/expense-categories"),
  ]);
  return {
    expenses: Array.isArray(result?.expenses) ? result.expenses : [],
    totalAmount: result?.totalAmount || 0,
    categories: Array.isArray(categories) ? categories.map((category) => category.name) : [],
  };
};

/**
 * Expenses for the selected period (preset or custom date range), the expense categories,
 * and every mutation of the page. The period state lives here because the loader depends on it.
 */
export function useExpenses() {
  const toast = useToast();
  const [dateFilter, setDateFilter] = useState(DEFAULT_FILTER);
  const [appliedRange, setAppliedRange] = useState(EMPTY_RANGE);

  // A custom filter without a complete range has nothing to load yet.
  const enabled = dateFilter !== CUSTOM_FILTER || isCompleteRange(appliedRange);
  const { data, isLoading, error, reload } = useAsyncData(
    () => loadExpenses(dateFilter, appliedRange),
    [dateFilter, appliedRange],
    {
      initialData: EMPTY,
      enabled,
      cacheKey: `expenses:${dateFilter}:${JSON.stringify(appliedRange)}`,
    }
  );

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const selectPeriod = useCallback((value) => {
    setDateFilter(value);
    setAppliedRange(EMPTY_RANGE);
  }, []);

  const applyCustomRange = useCallback((range) => {
    setAppliedRange(range);
    setDateFilter(CUSTOM_FILTER);
  }, []);

  /** Falls back to the default period if "custom" was left without a complete range. */
  const dropIncompleteCustomRange = useCallback(() => {
    if (dateFilter === CUSTOM_FILTER && !isCompleteRange(appliedRange)) setDateFilter(DEFAULT_FILTER);
  }, [appliedRange, dateFilter]);

  // Runs a mutation, reports the outcome and refreshes the list. Resolves true on success.
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

  const saveExpense = useCallback(
    (expense) =>
      expense._id
        ? mutate(() => api.put(`/api/expenses/${expense._id}`, toExpensePayload(expense)), "Expense updated")
        : mutate(() => api.post("/api/expenses", toExpensePayload(expense)), "Expense recorded"),
    [mutate]
  );

  const deleteExpense = useCallback(
    (expenseId) => mutate(() => api.delete(`/api/expenses/${expenseId}`), "Expense deleted"),
    [mutate]
  );

  const addCategory = useCallback(
    (name) => mutate(() => api.post("/api/expense-categories", { name }), "Category added"),
    [mutate]
  );

  const deleteCategory = useCallback(
    (name) => mutate(() => api.delete(`/api/expense-categories/${encodeURIComponent(name)}`), "Category deleted"),
    [mutate]
  );

  const categoryOptions = useMemo(() => ["All", ...data.categories], [data.categories]);

  return {
    expenses: data.expenses,
    totalAmount: data.totalAmount,
    categories: data.categories,
    categoryOptions,
    isLoading,
    dateFilter,
    appliedRange,
    selectPeriod,
    applyCustomRange,
    dropIncompleteCustomRange,
    saveExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
  };
}
