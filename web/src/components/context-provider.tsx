"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/api";
import { getMe } from "@/api/auth";
import type { User } from "@/api/types";
import { forgetPushSubscription } from "@/components/notifications";

export type AppContextProps = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<User | null>;
  logout: () => void;
};

export const AppContext = createContext<AppContextProps>({
  user: null,
  loading: true,
  refreshUser: async () => null,
  logout: () => {},
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export const useAppContext = (): AppContextProps => useContext(AppContext);

export default function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!api.hasToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      api.removeToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await forgetPushSubscription();
    api.removeToken();
    setUser(null);
    queryClient.clear();
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, refreshUser, logout }),
    [user, loading, refreshUser, logout],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </QueryClientProvider>
  );
}
