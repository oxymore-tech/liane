import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Liane, Ref, TrackedMemberLocation, User } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { BehaviorSubject, Observable, Subject, SubscriptionLike } from "rxjs";
import { useLianeStatus } from "@/components/trip/trip";
import { LianeGeolocation } from "@/api/service/location";
import { useIsFocused } from "@react-navigation/native";
import { AppLogger } from "@/api/logger";

export interface TripGeolocation {
  liane: Liane;
  isActive: boolean;
  subscribeToUpdates: (memberId: Ref<User>, callback: (l: TrackedMemberLocation | null) => void) => SubscriptionLike | undefined;
}
// @ts-ignore
const TripGeolocationContext = createContext<TripGeolocation | undefined>();
export const TripGeolocationProvider = ({ liane, children }: { liane: Liane } & PropsWithChildren) => {
  const [geolocRunning, setGeolocRunning] = useState<boolean | undefined>(undefined);
  const { services, user } = useContext(AppContext);
  const [observables, setObservables] = useState<{ [k: string]: Observable<TrackedMemberLocation | null> }>({});
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
      setObservables({});
      return;
    }
    const members = liane.members.map(m => m.user.id!); // liane.driver.user === user!.id ? liane.members.map(m => m.user.id!) : [liane.driver.user];
    const subjects: { [k: string]: Subject<TrackedMemberLocation | null> } = {};
    for (let m of members) {
      subjects[m] = new BehaviorSubject<TrackedMemberLocation | null>(null);
    }
    const subscriptions = members.map(member =>
      services.realTimeHub.subscribeToPosition(liane.id!, member, l => {
        subjects[member].next(l);
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
  }, [user?.id, liane, services.realTimeHub, shouldBeActive]);

  if (geolocRunning === undefined) {
    // Return null while fetching informations
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

/*export const useMemberIsMoving = (memberId: string) => {
  const lastLocUpdate = useMemberTripGeolocation(memberId);
  const [moving, setMoving] = useState(!!lastLocUpdate && (new Date().getTime() - new Date(lastLocUpdate.at).getTime()) / 1000 < StalePingDelay);

  useEffect(() => {
    if (!lastLocUpdate) {
      return;
    } else {
      const timeout = setInterval(() => {
        const d = (new Date().getTime() - new Date(lastLocUpdate.at).getTime()) / 1000;
        setMoving(d < StalePingDelay);
      }, 15 * 1000);
      return () => clearInterval(timeout);
    }
  }, [lastLocUpdate]);

  return { ...lastLocUpdate, moving };
};*/
export const useMemberRealTimeDelay = (memberId: string) => {
  const lastDriverLocUpdate = useMemberTripGeolocation(memberId);
  const [delay, setDelay] = useState<number>(() => {
    if (!lastDriverLocUpdate) {
      return 0;
    }
    return lastDriverLocUpdate.isMoving ? (new Date().getTime() - new Date(lastDriverLocUpdate.at).getTime()) / 1000 : lastDriverLocUpdate.delay;
  });

  useEffect(() => {
    if (!lastDriverLocUpdate) {
      return;
    } else {
      const timeout = setInterval(() => {
        if (lastDriverLocUpdate.isMoving) {
          setDelay((new Date().getTime() - new Date(lastDriverLocUpdate.at).getTime()) / 1000);
        } else {
          setDelay(lastDriverLocUpdate.delay);
        }
      }, 15 * 1000);
      return () => clearInterval(timeout);
    }
  }, [lastDriverLocUpdate]);

  return lastDriverLocUpdate ? { ...lastDriverLocUpdate, delay } : null;
};
