"use client";
import { Localization } from "@liane/common";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

//@ts-ignore
const LocalizationContext = createContext<Localization>();

export const LocalizationProvider = ({ children }: PropsWithChildren) => {
  const [localization, setLocalization] = useState<Localization | undefined>();
  useEffect(() => {
    setLocalization(new Localization(navigator.language));
  }, []);
  if (!localization) return null;
  return <LocalizationContext.Provider value={localization}>{children}</LocalizationContext.Provider>;
};

export const useLocalization = () => useContext(LocalizationContext);
