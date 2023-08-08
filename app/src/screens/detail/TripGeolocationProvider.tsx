import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Liane, Ref, TrackedMemberLocation, User } from "@/api";
import BackgroundGeolocationService from "../../../native-modules/geolocation";
import { AppContext } from "@/components/ContextProvider";
import { BehaviorSubject, Observable, Subject, SubscriptionLike } from "rxjs";

export interface TripGeolocation {
  liane: Liane;
  isActive: boolean;
  subscribeToUpdates: (memberId: Ref<User>, callback: (l: TrackedMemberLocation | null) => void) => SubscriptionLike | undefined;
}
// @ts-ignore
const TripGeolocationContext = createContext<AppBackController>();
export const TripGeolocationProvider = ({ liane, children }: { liane: Liane } & PropsWithChildren) => {
  const [geolocRunning, setGeolocRunning] = useState<boolean | undefined>(undefined);
  const { services } = useContext(AppContext);
  const [observables, setObservables] = useState<{ [k: string]: Observable<TrackedMemberLocation | null> }>({});
  useEffect(() => {
    if (liane.state === "Started") {
      BackgroundGeolocationService.isRunning().then(setGeolocRunning);
    } else {
      setGeolocRunning(false);
    }
  }, [liane.state]);
  if (geolocRunning === undefined) {
    return null;
  }

  useEffect(() => {
    const subjects: { [k: string]: Subject<TrackedMemberLocation | null> } = {};
    for (let m of liane.members) {
      subjects[m.user.id!] = new BehaviorSubject<TrackedMemberLocation | null>(null);
    }
    // Only subscribe to driver for now
    const sus = services.realTimeHub.subscribeToPosition(liane.id!, liane.driver.user, l => {
      console.debug(l);
      subjects[liane.driver.user].next(l);
    });
    setObservables(subjects);
    return () => {
      sus.then(s => {
        s.unsubscribe();
      });
    };
  }, [liane.id!]);

  const value: TripGeolocation = {
    liane,
    isActive: geolocRunning,
    subscribeToUpdates: (memberId, callback) => {
      return observables[memberId]?.subscribe(callback);
    }
  };

  return <TripGeolocationContext.Provider value={value}>{children}</TripGeolocationContext.Provider>;
};

export const useTripGeolocation = () => {
  return useContext<TripGeolocation>(TripGeolocationContext);
};

export const useMemberTripGeolocation = (memberId: string) => {
  const geoloc = useTripGeolocation();
  const [lastLocUpdate, setLastLocUpdate] = useState<null | TrackedMemberLocation>(null);
  useEffect(() => {
    const s = geoloc?.subscribeToUpdates(memberId, setLastLocUpdate);
    return () => s?.unsubscribe();
  }, [geoloc, memberId]);
  return lastLocUpdate;
};
