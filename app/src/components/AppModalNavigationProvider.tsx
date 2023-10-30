import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

import { getSetting } from "@/api/storage";
import { LianeGeolocation } from "@/api/service/location";
import { RootNavigation } from "@/api/navigation";
import { AppContext } from "@/components/context/ContextProvider";
import { UnionUtils } from "@/api";
import { MemberAccepted } from "@/api/event";
import { Event } from "@/api/notification";

export interface IAppModalNavigation {
  showTutorial: (as: "passenger" | "driver", lianeId?: string) => void;
  shouldShow: undefined | "driver" | "passenger";
}
// @ts-ignore
export const AppModalNavigationContext = createContext<IAppModalNavigation>();
export const AppModalNavigationProvider = (props: PropsWithChildren) => {
  const { services, user: u } = useContext(AppContext);
  const [shouldShow, setShowTutorial] = useState<{ showAs: "driver" | "passenger"; lianeId?: undefined | string } | undefined>(undefined);

  useEffect(() => {
    if (!u) {
      return;
    }
    getSetting("geolocation").then(async setting => {
      const mismatchedPermissions = !!setting && setting !== "None" && !(await LianeGeolocation.checkBackgroundGeolocationPermission());
      if (mismatchedPermissions) {
        // Permissions don't match saved settings, so show again

        RootNavigation.navigate("TripGeolocationWizard", { showAs: null, lianeId: undefined });
        return;
      }

      if (!setting) {
        setShowTutorial({ showAs: "driver" });
        const sub = services.realTimeHub.subscribeToNotifications(async n => {
          if (UnionUtils.isInstanceOf<Event>(n, "Event") && UnionUtils.isInstanceOf<MemberAccepted>(n.payload, "MemberAccepted")) {
            setShowTutorial({ showAs: "passenger", lianeId: n.payload.liane });
            sub.unsubscribe();
          }
        });

        return () => sub.unsubscribe();
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
