import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

import { LianeGeolocation } from "@/api/service/location";
import { RootNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { AppStorage } from "@/api/storage";
import { GeolocationPermission } from "../../native-modules/geolocation";

export type AppModalNavigationProps = {
  showTutorial: (as: "passenger" | "driver", lianeId?: string) => void;
  shouldShow: undefined | "driver" | "passenger";
};

// @ts-ignore
export const AppModalNavigationContext = createContext<AppModalNavigationProps>();

export const AppModalNavigationProvider = (props: PropsWithChildren) => {
  const { services, user: u } = useContext(AppContext);
  const [shouldShow, setShowTutorial] = useState<{ showAs: "driver" | "passenger"; lianeId?: undefined | string } | undefined>(undefined);

  useEffect(() => {
    if (!u) {
      return;
    }
    AppStorage.getSetting("geolocation").then(async setting => {
      const geolocationPermission = await LianeGeolocation.checkGeolocationPermission();
      const mismatchedPermissions = !!setting && setting !== "None" && geolocationPermission === GeolocationPermission.Denied;
      if (mismatchedPermissions) {
        // Permissions don't match saved settings, so show again

        RootNavigation.navigate("TripGeolocationWizard", { showAs: null, lianeId: undefined });
        return;
      }

      if (!setting) {
        setShowTutorial({ showAs: "driver" });
      }
    });
  }, [services.realTimeHub, u]);

  return (
    <AppModalNavigationContext.Provider
      value={{
        shouldShow: shouldShow?.showAs,
        showTutorial: (as, lianeId) => {
          setShowTutorial(undefined);

          RootNavigation.navigate("TripGeolocationWizard", {
            showAs: as,
            lianeId: lianeId ?? (as === shouldShow?.showAs ? shouldShow.lianeId : undefined)
          });
        }
      }}>
      {props.children}
    </AppModalNavigationContext.Provider>
  );
};
