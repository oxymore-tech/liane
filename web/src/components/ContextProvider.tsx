"use client";

import React, { createContext, PropsWithChildren, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AppStorage, AuthService, AuthServiceClient, FullUser, HttpClient, RoutingService, RoutingServiceClient } from "@liane/common";
import { NodeAppEnv } from "@/api/env";
import { LocalStorageImpl } from "@/api/storage";
import { WebLogger } from "@/api/logger";
import { RecordService, RecordServiceClient } from "@/api/records";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Flowbite } from "flowbite-react";
import { Header } from "@/components/navigation/Header";
import { SideMenu } from "@/components/navigation/SideMenu";
import { Navigation } from "@/api/navigation";
import { LoadingViewIndicator } from "@/components/base/LoadingViewIndicator";
import { usePathname, useRouter } from "next/navigation";
import { ToastMessage } from "@/components/base/ToastMessage";
import { PointsAdminService, PointsAdminServiceClient } from "@/api/points_admin";
import { OsmService, OsmServiceClient } from "@/api/osm";

type AppContextProps = {
  user?: FullUser;
  refreshUser: () => Promise<void>;
  services: {
    storage: AppStorage;
    auth: AuthService;
    record: RecordService;
    routing: RoutingService;
    rallyingPoint: PointsAdminService;
    osm: OsmService;
  };
};
//@ts-ignore
const AppContext = createContext<AppContextProps>({});

export const useAppContext = (): AppContextProps => useContext(AppContext);
export const useAppServices = () => useContext(AppContext)!.services;
export const useCurrentUser = () => useContext(AppContext)?.user;

const storage = new LocalStorageImpl();
const http = new HttpClient(NodeAppEnv.baseUrl, WebLogger, storage);
const auth = new AuthServiceClient(http, storage);
const record = new RecordServiceClient(http);
const routing = new RoutingServiceClient(http);
const rallyingPoint = new PointsAdminServiceClient(http);
const osm = new OsmServiceClient(storage);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

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
              storage,
              auth,
              routing,
              rallyingPoint,
              record,
              osm
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
    if (user === null && pathname.startsWith("/dashboard")) router.replace("/");
  }, [pathname, router, user]);

  return (
    <main className="h-screen w-full flex flex-col dark:bg-gray-800 bg-white overflow-hidden" {...props}>
      <Flowbite>
        <Header />

        <div className="w-full grow max-h-full">
          {!!user && (
            <div className="flex h-full">
              <SideMenu pages={Navigation} />
              <div className="flex relative grow w-full">{children}</div>
            </div>
          )}
          {user === null && children}
          {user === undefined && <LoadingViewIndicator />}
        </div>
      </Flowbite>
    </main>
  );
};
