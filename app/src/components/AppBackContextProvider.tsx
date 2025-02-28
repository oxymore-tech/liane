// Return true if event was handled in the callback
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo } from "react";
import { RootNavigation } from "@/components/context/routing";
import { BackHandler } from "react-native";

export interface AppBackController {
  goBack: () => void;
}

const AppBackActionContext = createContext<AppBackController>({ goBack: () => {} });

export const AppBackContextProvider = ({ backHandler, children }: { backHandler?: () => boolean } & PropsWithChildren) => {
  const handler = useMemo(() => {
    if (backHandler) {
      return backHandler;
    }
    return () => false;
  }, [backHandler]);

  //useBackHandler(handler);
  useEffect(() => {
    const currentBackHandler = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => currentBackHandler.remove();
  }, [handler]);

  const backController = {
    goBack: () => {
      if (!handler()) {
        RootNavigation.goBack();
      }
    }
  };
  return <AppBackActionContext.Provider value={backController}>{children}</AppBackActionContext.Provider>;
};

export const useAppBackController = () => {
  return useContext(AppBackActionContext);
};
