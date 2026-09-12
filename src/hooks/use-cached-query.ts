import { useQuery, type QueryKey } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cacheGet, cacheSet } from "@/lib/idb-cache";

/**
 * Offline-first query: shows IndexedDB cached data immediately, fetches fresh data
 * in the background, then updates the cache and UI.
 */
export function useCachedQuery<T>(opts: {
  queryKey: QueryKey;
  cacheKey: string;
  queryFn: () => Promise<T>;
  enabled?: boolean;
}) {
  const [cached, setCached] = useState<{ value: T; savedAt: number } | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    cacheGet<T>(opts.cacheKey).then((entry) => alive && setCached(entry));
    return () => {
      alive = false;
    };
  }, [opts.cacheKey]);

  const query = useQuery({
    queryKey: opts.queryKey,
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
    queryFn: async () => {
      const value = await opts.queryFn();
      void cacheSet(opts.cacheKey, value);
      return value;
    },
  });
  const queryRefetch = query.refetch;

  useEffect(() => {
    if (opts.enabled === false || typeof window === "undefined") return;
    const refetchOnOnline = () => void queryRefetch();
    window.addEventListener("online", refetchOnOnline);
    return () => window.removeEventListener("online", refetchOnOnline);
  }, [opts.enabled, queryRefetch]);

  const data = query.data ?? cached?.value;
  const cacheChecked = cached !== undefined;
  const isLoading = data === undefined && (!cacheChecked || query.isPending);
  const isFromCache = query.data === undefined && cached != null;
  const isError = query.isError && data === undefined;

  return {
    data,
    isLoading,
    isError,
    isFromCache,
    refetch: queryRefetch,
    isFetching: query.isFetching,
    error: query.error,
  };
}
