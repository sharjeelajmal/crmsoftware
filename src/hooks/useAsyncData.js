"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Small data-loading hook for client pages with stale-while-revalidate caching.
 *
 *   const { data, isLoading, isFetching, error, reload } =
 *     useAsyncData(() => api.get("/api/products"), [], { cacheKey: "products" });
 *
 * - `cacheKey`: when given, the last result for that key is shown instantly on the next
 *   visit (no loader) while a fresh request runs in the background. Keys must include
 *   anything that changes the request (e.g. `purchases:${filter}`).
 * - `isLoading`  is true only until the first result is available (full-page Loader).
 * - `isFetching` is true during every request, including background refreshes.
 * - `deps` re-runs the loader (like useEffect deps); `reload()` re-runs it on demand.
 * - Results from stale requests are ignored, so fast filter changes never show old data.
 */

const cache = new Map(); // cacheKey -> last successful result (lives for the browser session)

export const clearAsyncDataCache = (prefix) => {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key);
  }
};

export function useAsyncData(loader, deps = [], { initialData = null, enabled = true, cacheKey } = {}) {
  const cached = cacheKey !== undefined && cache.has(cacheKey) ? cache.get(cacheKey) : undefined;
  const [data, setData] = useState(cached !== undefined ? cached : initialData);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(enabled);
  const [hasLoaded, setHasLoaded] = useState(cached !== undefined);
  const requestId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setIsFetching(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (id !== requestId.current) return;
      if (cacheKey !== undefined) cache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      if (id === requestId.current) setError(err);
    } finally {
      if (id === requestId.current) {
        setIsFetching(false);
        setHasLoaded(true);
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled) return;
    // Deps changed: show the cached result for the new key immediately, then refresh it.
    if (cacheKey !== undefined && cache.has(cacheKey)) {
      setData(cache.get(cacheKey));
      setHasLoaded(true);
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  const setDataAndCache = useCallback(
    (updater) => {
      setData((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (cacheKey !== undefined) cache.set(cacheKey, next);
        return next;
      });
    },
    [cacheKey]
  );

  return { data, setData: setDataAndCache, error, isLoading: isFetching && !hasLoaded, isFetching, reload: run };
}
