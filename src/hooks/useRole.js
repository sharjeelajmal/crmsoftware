"use client";

import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { normalizeRole } from "@/constants/roles";

/**
 * The signed-in user's role ("admin" / "cutting_master"), or null until GET /api/profile has answered — so a page
 * shared by both roles shows admin-only controls only once it knows. Shares the "profile" cache with the profile page.
 */
export function useRole() {
  const { data } = useAsyncData(() => api.get("/api/profile"), [], { cacheKey: "profile" });
  return data?.role ? normalizeRole(data.role) : null;
}

export default useRole;
