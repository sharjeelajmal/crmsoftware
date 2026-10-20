"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { emitProfileUpdated } from "@/constants/events";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { toProfilePayload, validatePasswordForm } from "../utils";

/** The admin profile (editable in place) plus save / change-password mutations. */
export function useProfile() {
  const toast = useToast();
  const {
    data: profile,
    setData: setProfile,
    isLoading,
    error,
  } = useAsyncData(() => api.get("/api/profile"), [], { cacheKey: "profile" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const updateField = useCallback((name, value) => setProfile((prev) => ({ ...prev, [name]: value })), [setProfile]);

  const saveProfile = useCallback(async () => {
    try {
      await api.put("/api/profile", toProfilePayload(profile));
      toast.success("Profile updated successfully!");
      emitProfileUpdated();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }, [profile, toast]);

  const updatePassword = useCallback(
    async (form) => {
      const problem = validatePasswordForm(form);
      if (problem) {
        toast.error(problem);
        return false;
      }
      setIsUpdatingPassword(true);
      try {
        await api.post("/api/profile/change-password", {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        });
        toast.success("Password updated successfully!");
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setIsUpdatingPassword(false);
      }
    },
    [toast]
  );

  return { profile, isLoading, updateField, saveProfile, updatePassword, isUpdatingPassword };
}
