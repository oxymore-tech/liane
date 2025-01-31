import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Car, Trip, TrackingInfo } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { BehaviorSubject, Observable, SubscriptionLike } from "rxjs";
import { useTripStatus } from "@/components/trip/trip";
import { LianeGeolocation } from "@/api/service/location";
import { useIsFocused } from "@react-navigation/native";
import { AppLogger } from "@/api/logger";
import { useRealtimeDelay } from "@/util/hooks/delay";

export type TripGeolocation = {
  trip?: Trip;
  isActive: boolean;
  subscribe: (callback: (l: TrackingInfo | null) => void) => SubscriptionLike | undefined;
};

// @ts-ignore
const TripGeolocationContext = createContext<TripGeolocation | undefined>();
export const TripGeolocationProvider = ({ trip, children }: { trip?: Trip } & PropsWithChildren) => {
  const [geolocRunning, setGeolocRunning] = useState<boolean | undefined>(undefined);
  const { services } = useContext(AppContext);
  const [observable, setObservable] = useState<Observable<TrackingInfo | null> | null>();
  const isFocused = useIsFocused();
  const lianeStatus = useTripStatus(trip);
  const shouldBeActive = isFocused && (lianeStatus === "Started" || lianeStatus === "StartingSoon");

  // Check if service is running locally
  useEffect(() => {
    if (!trip) {
      return;
    }
    if (shouldBeActive) {
      LianeGeolocation.currentLiane().then(id => {
        setGeolocRunning(trip.id! === id);
      });
    } else {
      setGeolocRunning(false);
    }
    const sub = LianeGeolocation.watchRunningService(l => setGeolocRunning(l === trip.id!));
    return () => sub.unsubscribe();
  }, [trip, shouldBeActive]);

  // Observe shared position by other members
  useEffect(() => {
    if (!trip) {
      return;
    }
    AppLogger.debug("GEOLOC", "Recreating geolocation observables");
    if (!shouldBeActive) {
      setObservable(null);
      return;
    }
    const subject = new BehaviorSubject<TrackingInfo | null>(null);
    const sus = services.realTimeHub.subscribeToTrackingInfo(trip.id!, l => {
      subject.next(l);
    });
    setObservable(subject);
    return () => {
      sus.then(s => s.unsubscribe());
    };
  }, [trip, services.realTimeHub, shouldBeActive]);

  if (geolocRunning === undefined) {
    // Return null while fetching info
    return null;
  }
  const value: TripGeolocation = {
    trip,
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
  if (!lastLocUpdate) {
    return;
  }
  return { ...lastLocUpdate.car, delay } as Car;
};
