"use client";

import { useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { Modal } from "@/components/ui/Modal";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { AddProductPopup } from "@/features/inventory/components/AddProductPopup";
import { categoryOf } from "@/features/inventory/utils";

const loadCategories = async () => {
  const categories = await api.get("/api/categories");
  return Array.isArray(categories) ? categories.map((category) => category.name) : [];
};

/**
 * "New article" from the cutting form (admin, client 2026-11-20): the Inventory's add-product form without stock —
 * category (picked, or typed when it is new), name and (optionally) sizes. `onSave(product, { newCategory })`
 * resolves true when the article was added; a typed category that matches one keeps that one's spelling.
 */
export function NewArticlePopup({ onSave, onCancel, isSaving = false }) {
  const toast = useToast();
  const { data: categories, isLoading, error } = useAsyncData(loadCategories, [], { cacheKey: "categories" });

  useEffect(() => {
    if (error) toast.error(errorMessage(error, "Could not load the categories"));
  }, [error, toast]);

  if (isLoading || !categories) {
    return (
      <Modal onClose={onCancel} size="sm">
        <Loader inline text="Loading categories" />
      </Modal>
    );
  }

  return (
    <AddProductPopup
      categories={categories}
      initialCategory=""
      withStock={false}
      allowNewCategory
      title="New article"
      submitLabel="Add article"
      isSaving={isSaving}
      onSave={async (product) => {
        const known = categoryOf(categories, product.category);
        const input = { ...product, category: known ?? product.category.trim() };
        if (await onSave(input, { newCategory: !known })) onCancel();
      }}
      onCancel={onCancel}
    />
  );
}

export default NewArticlePopup;
