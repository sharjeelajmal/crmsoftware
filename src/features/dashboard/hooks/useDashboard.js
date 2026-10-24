"use client";

import { useCallback, useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { toProductPayload, validateProductInput } from "@/features/inventory/utils";

/** The dashboard refreshes itself this often while the tab is visible (and when the tab comes back). */
const REFRESH_MS = 60_000;

const EMPTY = { dashboard: null, categories: [] };

const loadDashboard = async () => {
  const [dashboard, categories] = await Promise.all([api.get("/api/dashboard"), api.get("/api/categories")]);
  return {
    dashboard,
    categories: Array.isArray(categories) ? categories.map((category) => category.name) : [],
  };
};

/** Factory dashboard data (GET /api/dashboard), kept fresh in the background, plus quick-add product. */
export function useDashboard() {
  const toast = useToast();
  const { data, isLoading, isFetching, error, reload } = useAsyncData(loadDashboard, [], {
    initialData: EMPTY,
    cacheKey: "factory-dashboard",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) reload();
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);

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

  return { ...data, isLoading, isFetching, error, reload, addProduct };
}
