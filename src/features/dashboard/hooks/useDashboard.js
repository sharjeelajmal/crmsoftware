"use client";

import { useCallback, useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { toProductPayload, validateProductInput } from "@/features/inventory/utils";

const EMPTY = { analytics: null, products: [], categories: [] };

const loadDashboard = async () => {
  const [analytics, products, categories] = await Promise.all([
    api.get("/api/analytics?filter=today"),
    api.get("/api/products"),
    api.get("/api/categories"),
  ]);
  return {
    analytics,
    products: Array.isArray(products) ? products : [],
    categories: Array.isArray(categories) ? categories.map((category) => category.name) : [],
  };
};

/** Today's analytics, the product list (stock alert) and categories (quick-add product). */
export function useDashboard() {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(loadDashboard, [], {
    initialData: EMPTY,
    cacheKey: "dashboard",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const addProduct = useCallback(
    async (product) => {
      const problem = validateProductInput(product);
      if (problem) {
        toast.info(problem);
        return false;
      }
      try {
        await api.post("/api/products", toProductPayload(product));
        toast.success("Product added");
        await reload();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [reload, toast]
  );

  return { ...data, isLoading, addProduct };
}
