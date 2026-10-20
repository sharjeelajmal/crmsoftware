"use client";

import { useCallback, useEffect, useMemo } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import {
  hasSizes,
  sizesWithChange,
  toProductPayload,
  toProductUpdatePayload,
  validateProductDetails,
  validateProductInput,
  validateSizeRows,
} from "../utils";

const EMPTY = { products: [], categories: [] };

const loadCatalogue = async () => {
  const [products, categories] = await Promise.all([api.get("/api/products"), api.get("/api/categories")]);
  return {
    products: Array.isArray(products) ? products : [],
    categories: Array.isArray(categories) ? categories.map((category) => category.name) : [],
  };
};

/** Products + categories for the inventory page, plus every mutation it needs. */
export function useInventory() {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(loadCatalogue, [], {
    initialData: EMPTY,
    cacheKey: "inventory",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  // Runs a mutation, reports the outcome and refreshes the list. Resolves true on success.
  // API errors (e.g. the 409 for a product with lots in production) are shown with their own message.
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

  const addProduct = useCallback(
    (product) => {
      const problem = validateProductInput(product);
      if (problem) {
        toast.info(problem);
        return Promise.resolve(false);
      }
      return mutate(() => api.post("/api/products", toProductPayload(product)), "Product added");
    },
    [mutate, toast]
  );

  /** Edits name/category/prices and, for a sized product, replaces its size list. */
  const updateProduct = useCallback(
    (productId, product) => {
      const problem = validateProductDetails(product) || (product.sizes ? validateSizeRows(product.sizes) : null);
      if (problem) {
        toast.info(problem);
        return Promise.resolve(false);
      }
      return mutate(() => api.put(`/api/products/${productId}`, toProductUpdatePayload(product)), "Product updated");
    },
    [mutate, toast]
  );

  const addCategory = useCallback(
    (name) => mutate(() => api.post("/api/categories", { name }), "Category added"),
    [mutate]
  );

  const deleteProduct = useCallback(
    (productId) => mutate(() => api.delete(`/api/products/${productId}`), "Product deleted"),
    [mutate]
  );

  const deleteCategory = useCallback(
    (name) => mutate(() => api.delete(`/api/categories/${encodeURIComponent(name)}`), "Category deleted"),
    [mutate]
  );

  /**
   * Adds or removes `quantity` pieces. A sized product needs a `size`; the whole size list is sent
   * back (the server recomputes the total). Stock never goes below zero.
   */
  const updateStock = useCallback(
    (productId, action, quantity, size) => {
      const product = data.products.find((item) => item._id === productId);
      if (!product) return Promise.resolve(false);
      const delta = action === "add" ? quantity : -quantity;

      if (hasSizes(product)) {
        if (!size) {
          toast.info("Please select a size.");
          return Promise.resolve(false);
        }
        const sizes = sizesWithChange(product.sizes, size, delta);
        if (!sizes) {
          toast.info(`Size ${size} does not have ${quantity} pcs to remove.`);
          return Promise.resolve(false);
        }
        return mutate(() => api.put(`/api/products/${productId}`, { sizes }), "Stock updated");
      }

      const remaining = Math.max(0, (parseInt(product.remaining, 10) || 0) + delta);
      return mutate(() => api.put(`/api/products/${productId}`, { remaining }), "Stock updated");
    },
    [data.products, mutate, toast]
  );

  const categoryOptions = useMemo(() => ["All", ...data.categories], [data.categories]);

  return {
    products: data.products,
    categories: data.categories,
    categoryOptions,
    isLoading,
    addProduct,
    updateProduct,
    addCategory,
    deleteProduct,
    deleteCategory,
    updateStock,
  };
}
