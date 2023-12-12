import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Liane, TrackingInfo } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { BehaviorSubject, Observable, SubscriptionLike } from "rxjs";
import { useLianeStatus } from "@/components/trip/trip";
import { LianeGeolocation } from "@/api/service/location";
import { useIsFocused } from "@react-navigation/native";
import { AppLogger } from "@/api/logger";
import { useRealtimeDelay } from "@/util/hooks/delay";

export interface TripGeolocation {
  liane: Liane;
  isActive: boolean;
  subscribe: (callback: (l: TrackingInfo | null) => void) => SubscriptionLike | undefined;
}
// @ts-ignore
const TripGeolocationContext = createContext<TripGeolocation | undefined>();
export const TripGeolocationProvider = ({ liane, children }: { liane: Liane } & PropsWithChildren) => {
  const [geolocRunning, setGeolocRunning] = useState<boolean | undefined>(undefined);
  const { services } = useContext(AppContext);
  const [observable, setObservable] = useState<Observable<TrackingInfo | null> | null>();
  const isFocused = useIsFocused();
  const lianeStatus = useLianeStatus(liane);
  const shouldBeActive = isFocused && (lianeStatus === "Started" || lianeStatus === "StartingSoon");

  // Check if service is running locally
  useEffect(() => {
    if (shouldBeActive) {
      LianeGeolocation.currentLiane().then(id => {
        setGeolocRunning(liane.id! === id);
      });
    } else {
      setGeolocRunning(false);
    }
    const sub = LianeGeolocation.watchRunningService(l => setGeolocRunning(l === liane.id!));
    return () => sub.unsubscribe();
  }, [shouldBeActive, liane.id]);

  // Observe shared position by other members
  useEffect(() => {
    AppLogger.debug("GEOLOC", "Recreating geolocation observables");
    if (!shouldBeActive) {
      setObservable(null);
      return;
    }
    const subject = new BehaviorSubject<TrackingInfo | null>(null);
    const sus = services.realTimeHub.subscribeToTrackingInfo(liane.id!, l => {
      subject.next(l);
    });
    setObservable(subject);
    return () => {
      sus.then(s => s.unsubscribe());
    };
  }, [liane, services.realTimeHub, shouldBeActive]);

  if (geolocRunning === undefined) {
    // Return null while fetching informations
    return null;
  }
  const value: TripGeolocation = {
    liane,
    isActive: geolocRunning,
    subscribe: callback => {
      return observable?.subscribe(callback);
    }
  };
  return <TripGeolocationContext.Provider value={value}>{children}</TripGeolocationContext.Provider>;
};

export const useTripGeolocation = () => {
  return useContext<TripGeolocation | undefined>(TripGeolocationContext);
};

export const useTrackingInfo = () => {
  const geoloc = useTripGeolocation();
  const [lastLocUpdate, setLastLocUpdate] = useState<null | TrackingInfo>(null);
  useEffect(() => {
    const s = geoloc?.subscribe(setLastLocUpdate);
    return () => {
      s?.unsubscribe();
    };
  }, [geoloc]);
  return lastLocUpdate;
};

export const useCarDelay = () => {
  const lastLocUpdate = useTrackingInfo();
  const delay = useRealtimeDelay(lastLocUpdate?.car);
  return lastLocUpdate?.car ? { ...lastLocUpdate.car, delay } : null;
};
