"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
import { AppEnv, AppStorage, HttpClient, AuthService, AuthServiceClient, FullUser } from "@liane/common";
import { NodeAppEnv } from "@/api/env";
import { LocalStorageImpl } from "@/api/storage";
import { ConsoleAppLogger } from "@/api/logger";

type AppContextProps = {
  user?: FullUser;
  refreshUser: () => Promise<void>;
  services: {
    env: AppEnv;
    storage: AppStorage;
    auth: AuthService;
  };
};

export const AppContext = createContext({});

const storage = new LocalStorageImpl();
const logger = new ConsoleAppLogger();
const http = new HttpClient({ env: NodeAppEnv, storage, logger });
const auth = new AuthServiceClient(http);

export default function ContextProvider({ children }: { children: ReactNode }) {
  const [user, setInternalUser] = useState<FullUser>();

  const refreshUser = async () => {
    try {
      setInternalUser(await auth.me());
    } catch (e) {
      setInternalUser(undefined);
    }
  };

  useEffect(() => {
    storage
      .getRefreshToken()
      .then(t => {
        if (!t) {
          return;
        }
        return refreshUser();
      })
      .then();
  }, []);

  return (
    <AppContext.Provider
      value={
        {
          user,
          refreshUser,
          services: {
            env: NodeAppEnv,
            storage,
            auth
          }
        } as AppContextProps
      }>
      {children}
    </AppContext.Provider>
  );
}
