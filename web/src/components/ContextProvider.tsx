"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AppEnv, AppStorage, AuthService, AuthServiceClient, FullUser, HttpClient, RallyingPointClient, RoutingServiceClient } from "@liane/common";
import { NodeAppEnv } from "@/api/env";
import { LocalStorageImpl } from "@/api/storage";
import { ConsoleAppLogger } from "@/api/logger";
import { RecordService, RecordServiceClient } from "@/api/records";
import { QueryClient, QueryClientProvider } from "react-query";

type AppContextProps = {
  user?: FullUser;
  refreshUser: () => Promise<void>;
  services: {
    env: AppEnv;
    storage: AppStorage;
    auth: AuthService;
    record: RecordService;
    routing: RoutingServiceClient;
    rallyingPoint: RallyingPointClient;
  };
};
//@ts-ignore
const AppContext = createContext<AppContextProps>({});

export const useAppContext = (): AppContextProps => useContext(AppContext);
export const useAppServices = () => useContext(AppContext)!.services;
export const useCurrentUser = () => useContext(AppContext)?.user;

const storage = new LocalStorageImpl();
const logger = new ConsoleAppLogger();
const http = new HttpClient(NodeAppEnv, logger, storage);
const auth = new AuthServiceClient(http, storage);
const record = new RecordServiceClient(http);
const routing = new RoutingServiceClient(http);
const rallyingPoint = new RallyingPointClient(http);
const queryClient = new QueryClient();

export default function ContextProvider({ children }: { children: ReactNode }) {
  const [user, setInternalUser] = useState<FullUser | null | undefined>();

  const refreshUser = useMemo(
    () => async () => {
      try {
        if (!(await storage.getAccessToken())) setInternalUser(null);
        else setInternalUser((await auth.me()) || null);
      } catch (e) {
        setInternalUser(null);
      }
    },
    []
  );

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  if (user === undefined) return <p>Loading...</p>;
  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider
        value={
          {
            user,
            refreshUser,
            services: {
              env: NodeAppEnv,
              storage,
              auth,
              routing,
              rallyingPoint,
              record
            }
          } as AppContextProps
        }>
        {children}
      </AppContext.Provider>
    </QueryClientProvider>
  );
}
