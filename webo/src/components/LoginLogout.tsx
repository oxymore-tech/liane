import React, { useContext } from "react";
import { AppContext } from "@/components/ContextProvider";
import { Button } from "@/components/base/Button";

export interface LoginLogoutProps {
  className?: string
}

export function LoginLogout({ className = "" }: LoginLogoutProps) {
  const { user, setUser } = useContext(AppContext);

  function disconnect() {
    setUser(undefined);
  }

  return (
    <div className={`grid grid-cols-2 ${className}`}>
      {user
        ? (
          <>
            <span className="">Vous êtes connecté.</span>
            <Button
              label="Déconnexion"
              color="orange"
              onClick={() => disconnect()}
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
