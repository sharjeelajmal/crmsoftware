"use client";

import { useCallback, useEffect } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { toCreatePayload, toUpdatePayload } from "../utils";

/**
 * Loads the user list (admin only) and exposes the page mutations.
 * Each mutation resolves to true on success; API messages (400 self-protection, 409 last admin,
 * validation issues) are surfaced as error toasts.
 */
export function useUsers() {
  const toast = useToast();
  const { data, isLoading, error, reload } = useAsyncData(() => api.get("/api/users"), [], {
    initialData: [],
    cacheKey: "users",
  });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const run = useCallback(
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

  const createUser = useCallback(
    (form) => run(() => api.post("/api/users", toCreatePayload(form)), "User added successfully!"),
    [run]
  );

  const updateUser = useCallback(
    (id, form) => run(() => api.put(`/api/users/${id}`, toUpdatePayload(form)), "User updated successfully!"),
    [run]
  );

  const resetPassword = useCallback(
    (id, password) => run(() => api.put(`/api/users/${id}`, { password }), "Password reset successfully!"),
    [run]
  );

  const deleteUser = useCallback((id) => run(() => api.delete(`/api/users/${id}`), "User deleted."), [run]);

  return {
    users: Array.isArray(data) ? data : [],
    isLoading,
    reload,
    createUser,
    updateUser,
    resetPassword,
    deleteUser,
  };
}
