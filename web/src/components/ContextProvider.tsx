import React, { createContext, ReactNode, useEffect, useState } from "react";
import { getStoredToken, setStoredToken } from "@/api/storage";
import { AuthUser } from "@/api";
import { authService } from "@/api/auth-service";

/**
 * Application context format.
 */
interface AppContextProps {
  authUser?: AuthUser; // Authenticated user
  setAuthUser: (authUser?: AuthUser) => void; // Modifier for the previous
}

/**
 * Create default context.
 */
export const AppContext = createContext<AppContextProps>({
  setAuthUser: () => { }
});

/**
 * Initialise the context by getting whether the app. is
 * authorised to track the device and at which level.
 */
async function init() : Promise<{ authUser?:AuthUser }> {
  const storedToken = await getStoredToken();
  const authUser = storedToken ? await authService.me().catch(() => undefined) : undefined;

  return { authUser };
}

/**
 * Define the context of the application.
 */
export function ContextProvider(props: { children: ReactNode }) {
  const [authUser, setInternalAuthUser] = useState<AuthUser>();

  const setAuthUser = async (a?: AuthUser) => {
    await setStoredToken(a?.token);
    setInternalAuthUser(a);
  };

  // Check for an user
  useEffect(() => {
    init().then((r) => setAuthUser(r.authUser));
  }, []);

  const { children } = props;

  return (
    <AppContext.Provider
      value={{
        authUser,
        setAuthUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
