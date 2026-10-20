"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/components/ui/ToastProvider";
import { backupFileName, saveBlob } from "../utils";

const NO_STATUS = { message: "", type: "" };

const loadStats = async () => {
  const stats = await api.get("/api/backup/stats");
  return Array.isArray(stats) ? stats : [];
};

/** Collection record counts plus the CSV backup download. */
export function useBackup() {
  const toast = useToast();
  const { data: stats, isLoading, error } = useAsyncData(loadStats, [], { initialData: [], cacheKey: "backup-stats" });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [status, setStatus] = useState(NO_STATUS);

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error, toast]);

  const downloadBackup = useCallback(
    async (filter) => {
      setIsBackingUp(true);
      setStatus(NO_STATUS);
      try {
        // The response is a CSV blob, not JSON, so this is the one place a direct fetch is used.
        const response = await fetch(`/api/backup?filter=${filter}`, { cache: "no-store" });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || data?.message || "Failed to create backup from server.");
        }
        saveBlob(await response.blob(), backupFileName(filter));
        setStatus({ message: "Backup downloaded successfully!", type: "success" });
      } catch (err) {
        const message = errorMessage(err);
        setStatus({ message, type: "error" });
        toast.error(message);
      } finally {
        setIsBackingUp(false);
      }
    },
    [toast]
  );

  return { stats, isLoading, isBackingUp, status, downloadBackup };
}
