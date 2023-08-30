import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Liane, Ref, TrackedMemberLocation, User } from "@/api";
import { AppContext } from "@/components/context/ContextProvider";
import { BehaviorSubject, Observable, Subject, SubscriptionLike } from "rxjs";
import { useLianeStatus } from "@/components/trip/trip";
import { isLocationServiceRunning } from "@/api/service/location";
import { useIsFocused } from "@react-navigation/native";

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
  const isFocused = useIsFocused();
  const lianeStatus = useLianeStatus(liane);
  useEffect(() => {
    if ((isFocused && lianeStatus === "Started") || lianeStatus === "StartingSoon") {
      isLocationServiceRunning().then(setGeolocRunning);
    } else {
      setGeolocRunning(false);
    }
  }, [isFocused, liane.id, lianeStatus]);

  useEffect(() => {
    const subjects: { [k: string]: Subject<TrackedMemberLocation | null> } = {};
    for (let m of liane.members) {
      subjects[m.user.id!] = new BehaviorSubject<TrackedMemberLocation | null>(null);
    }
    const subscriptions = liane.members.map(member =>
      services.realTimeHub.subscribeToPosition(liane.id!, member.user.id!, l => {
        subjects[member.user.id!].next(l);
      })
    );
    setObservables(subjects);
    return () => {
      subscriptions.forEach(sus =>
        sus.then(s => {
          s.unsubscribe();
        })
      );
    };
  }, [liane, services.realTimeHub]);

  if (geolocRunning === undefined) {
    return null;
  }
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
  return useContext<TripGeolocation | undefined>(TripGeolocationContext);
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
