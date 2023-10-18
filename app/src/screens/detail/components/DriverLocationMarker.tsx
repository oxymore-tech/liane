import { useMemberTripGeolocation, useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import React from "react";
import { LatLng, User } from "@/api";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";
import { AppLogger } from "@/api/logger";

export const DriverLocationMarker = (props: { user: User; defaultLocation: LatLng }) => {
  const lastLocUpdate = useMemberTripGeolocation(props.user.id!);
  const geoloc = useTripGeolocation();
  AppLogger.debug("GEOLOC", `${props.user.pseudo}:`, lastLocUpdate);
  if (!geoloc) {
    return null; //<LianeMemberDisplay location={props.defaultLocation} size={40} user={props.user} minZoom={6} showLocationPin={false} />;
  } else if (!lastLocUpdate || !lastLocUpdate.location) {
    return null; //<LianeMemberDisplay location={props.defaultLocation} size={40} user={props.user} minZoom={6} active={false} showLocationPin={false} />;
  }

  return <LianeMemberDisplay location={lastLocUpdate.location} size={32} user={props.user} />;
};
