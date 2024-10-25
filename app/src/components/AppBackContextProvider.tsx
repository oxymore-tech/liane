// Return true if event was handled in the callback
import { useBackHandler } from "@react-native-community/hooks";
import React, { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { RootNavigation } from "@/components/context/routing";

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

  useBackHandler(handler);

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
