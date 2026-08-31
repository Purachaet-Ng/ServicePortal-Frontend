import { QueryClient } from "@tanstack/react-query";

/**
 * One client for the whole app. Imported by main.jsx (the provider) and by
 * auth.store.js (logout clears the cache) — so it lives in lib/, not in a
 * component, or those two would import each other.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60_000, // 5 minutes
      refetchOnWindowFocus: false,
      // A 4xx will fail exactly the same way on the retry — only retry the
      // errors that might actually be transient.
      retry: (failureCount, error) =>
        error?.status >= 400 && error?.status < 500 ? false : failureCount < 2,
    },
    mutations: { retry: false },
  },
});
