import React, { useContext } from "react";
import { AppContext } from "@/components/ContextProvider";
import { Button } from "@/components/base/Button";

export interface LoginLogoutProps {
  className?: string
}

export function LoginLogout({ className = "" }: LoginLogoutProps) {
  const { authUser, setAuthUser } = useContext(AppContext);

  function disconnect() {
    setAuthUser(undefined);
  }

  return (
    <div className={`grid grid-cols-2 ${className}`}>
      {authUser
        ? (
          <>
            <span className="">Vous êtes connecté.</span>
            <Button
              label="Déconnexion"
              color="orange"
              onClick={disconnect}
            />
          </>
        )
        : (
          <>
            <span className="">Vous n&apos;êtes pas connecté.</span>
            <Button
              label="Connexion"
              color="orange"
              href="/auth"
            />
          </>
        )}
    </div>
  );
}