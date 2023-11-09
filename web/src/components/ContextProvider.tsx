"use client";

import React, { createContext, PropsWithChildren, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AppEnv, AppStorage, AuthService, AuthServiceClient, FullUser, HttpClient, RallyingPointClient, RoutingServiceClient } from "@liane/common";
import { NodeAppEnv } from "@/api/env";
import { LocalStorageImpl } from "@/api/storage";
import { ConsoleAppLogger } from "@/api/logger";
import { RecordService, RecordServiceClient } from "@/api/records";
import { QueryClient, QueryClientProvider } from "react-query";
import { Flowbite } from "flowbite-react";
import { Header } from "@/components/navigation/Header";
import { SideMenu } from "@/components/navigation/SideMenu";
import { Navigation } from "@/api/navigation";
import { LoadingViewIndicator } from "@/components/base/LoadingViewIndicator";
import { usePathname, useRouter } from "next/navigation";
import { ToastMessage } from "@/components/base/ToastMessage";

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
const logger = new ConsoleAppLogger(NodeAppEnv);
const http = new HttpClient(NodeAppEnv.baseUrl, logger, storage);
const auth = new AuthServiceClient(http, storage);
const record = new RecordServiceClient(http);
const routing = new RoutingServiceClient(http);
const rallyingPoint = new RallyingPointClient(http);
const queryClient = new QueryClient();

export default function ContextProvider({ children }: { children: ReactNode }) {
  const [user, setInternalUser] = useState<FullUser | null | undefined>();
  const [offline, setOffline] = useState(false);

  const refreshUser = useMemo(
    () => async () => {
      try {
        if (!(await storage.getAccessToken())) setInternalUser(null);
        else setInternalUser((await auth.me()) || null);
      } catch (e) {
        setInternalUser(null);
        setOffline(true);
      }
    },
    []
  );

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

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
        {offline && <ToastMessage message={"Vous êtes hors ligne."} icon="offline" level="alert" />}
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

export const PageLayout = ({ children, ...props }: PropsWithChildren & React.HTMLProps<HTMLDivElement>) => {
  const user = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (user === null && pathname !== "/") router.replace("/");
  }, [pathname, router, user]);

  return (
    <main className="h-screen w-full flex flex-col dark:bg-gray-900 bg-white overflow-hidden" {...props}>
      <Flowbite>
        <Header />
        <div className="grow w-full relative">
          {!!user && (
            <div className="flex h-full">
              <SideMenu pages={Navigation} />
              <div className="flex h-full w-full">{children}</div>
            </div>
          )}
          {user === null && children}
          {user === undefined && <LoadingViewIndicator />}
        </div>
      </Flowbite>
    </main>
  );
};
