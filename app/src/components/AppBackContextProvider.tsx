// Return true if event was handled in the callback
import { useBackHandler } from "@react-native-community/hooks";
import React, { createContext, PropsWithChildren, useContext } from "react";
import { RootNavigation } from "@/api/navigation";

export interface AppBackController {
  goBack: () => void;
}
// @ts-ignore
const AppBackActionContext = createContext<AppBackController>();
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
