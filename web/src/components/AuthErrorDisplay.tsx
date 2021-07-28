import React from "react";
import { Button } from "@/components/base/Button";

/**
 * Authentication error.
 */
export function AuthErrorDisplay() {

  return (
    <div className="flex items-center h-screen font-sans">
      <div className="m-auto p-4 grid grid-cols-1">
        <img className="m-auto w-[3.23rem]" src="/images/logo.png" alt="Liane logo" />
        <span className="mt-5">Vous n&apos;êtes pas connecté.</span>
        <Button
          className="mt-5 ml-10 mr-10"
          label="Se connecter"
          color="orange"
          href="/auth"
        />
      </div>
    </div>
  );
}
