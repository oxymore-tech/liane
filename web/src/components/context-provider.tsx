"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";

export type AppContextProps = {
  // user will be added in Phase 2 (auth)
  loading: boolean;
};

export const AppContext = createContext<AppContextProps>({
  loading: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const useAppContext = (): AppContextProps => useContext(AppContext);

export default function AppProvider({ children }: { children: ReactNode }) {
  const value = {
    loading: false,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </QueryClientProvider>
  );
}
