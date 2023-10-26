import { useMemberTripGeolocation, useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import React, { useEffect, useState } from "react";
import { LatLng, User } from "@/api";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";
import { AppLogger } from "@/api/logger";
import { addSeconds } from "@/util/datetime";

export const LocationMarker = (props: { user: User; defaultLocation: LatLng }) => {
  const lastLocUpdate = useMemberTripGeolocation(props.user.id!);
  const geoloc = useTripGeolocation();
  const [moving, setMoving] = useState(true);
  AppLogger.debug("GEOLOC", `${props.user.pseudo}:`, lastLocUpdate);
  useEffect(() => {
    if (!geoloc || !lastLocUpdate) {
      return;
    } else {
      const timeout = setInterval(() => {
        setMoving(addSeconds(new Date(lastLocUpdate.at), 120).getTime() < new Date().getTime());
      }, 60 * 1000);
      return () => clearInterval(timeout);
    }
  }, [geoloc, lastLocUpdate]);

  if (!geoloc) {
    return null;
  } else if (!lastLocUpdate || !lastLocUpdate.location) {
    return null;
  }

  return <LianeMemberDisplay location={lastLocUpdate.location} size={32} user={props.user} delay={lastLocUpdate.delay} isMoving={moving} />;
};
