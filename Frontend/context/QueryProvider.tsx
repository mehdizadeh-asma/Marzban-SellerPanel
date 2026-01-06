"use client";

import type { ReactElement, ReactNode } from "react";
import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const QUERY_STALE_TIME_MS = 20 * 60 * 1000;
const QUERY_GC_TIME_MS = 30 * 60 * 1000;

type Props = {
  children: ReactNode;
};

export default function QueryProvider({ children }: Props): ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: QUERY_STALE_TIME_MS,
            gcTime: QUERY_GC_TIME_MS,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
