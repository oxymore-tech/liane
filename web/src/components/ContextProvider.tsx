import React, { createContext, ReactNode, useEffect, useState } from "react";
import { getStoredToken, setStoredToken } from "@/api/storage";
import { AuthResponse, AuthUser } from "@/api";
import { AuthService } from "@/api/services/auth-service";

interface AppContextProps {
  user?: AuthUser;
  setUser: (authUser?: AuthUser) => void;
}

export const AppContext = createContext<AppContextProps>({
  setUser: () => {}
});

async function init() : Promise<{ authResponse?: AuthResponse }> {
  const storedToken = await getStoredToken();
  const authResponse = storedToken ? await AuthService.me().catch(() => undefined) : undefined;

  return { authResponse };
}

export function ContextProvider(props: { children: ReactNode }) {
  const [user, setInternalUser] = useState<AuthUser>();

  const setUser = async (a?: AuthResponse) => {
    await setStoredToken(a?.token);
    setInternalUser(a?.user);
  };
  
  useEffect(() => {
    init().then((r) => setUser(r.authResponse));
  }, []);

  const { children } = props;

  return (
    <AppContext.Provider
      value={{
        user,
        setUser
      } as AppContextProps}
    >
      {children}
    </AppContext.Provider>
  );
}
