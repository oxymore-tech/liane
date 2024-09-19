// Return true if event was handled in the callback
import { useBackHandler } from "@react-native-community/hooks";
import React, { createContext, PropsWithChildren, useContext } from "react";
import { RootNavigation } from "@/components/context/routing";

export interface AppBackController {
  goBack: () => void;
}

const AppBackActionContext = createContext<AppBackController>({ goBack: () => {} });

export const AppBackContextProvider = (props: { backHandler: () => boolean } & PropsWithChildren) => {
  useBackHandler(props.backHandler);

  const backController = {
    goBack: () => {
      if (!props.backHandler()) {
        RootNavigation.goBack();
      }
    }
  };
  return <AppBackActionContext.Provider value={backController}>{props.children}</AppBackActionContext.Provider>;
};

export const useAppBackController = () => {
  return useContext(AppBackActionContext);
};
