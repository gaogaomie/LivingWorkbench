import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { AccessibleAnnouncer } from "../components/AccessibleAnnouncer";
import { ToastViewport } from "../components/ToastViewport";
import { showErrorToast } from "../data-provider/error-toast";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: showErrorToast }),
        mutationCache: new MutationCache({ onError: showErrorToast }),
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AccessibleAnnouncer />
      <ToastViewport />
      {children}
    </QueryClientProvider>
  );
}
