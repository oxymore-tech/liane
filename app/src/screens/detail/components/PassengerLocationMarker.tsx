import { useMemberTripGeolocation, useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import React from "react";
import { LatLng, User } from "@/api";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";
import { AppLogger } from "@/api/logger";

export const PassengerLocationMarker = (props: { user: User; defaultLocation: LatLng }) => {
  const lastLocUpdate = useMemberTripGeolocation(props.user.id!);
  AppLogger.debug("GEOLOC", `${props.user.pseudo}:`, lastLocUpdate);
  const geoloc = useTripGeolocation();
  if (!geoloc) {
    return <LianeMemberDisplay location={props.defaultLocation} size={40} user={props.user} minZoom={6} showLocationPin={false} />;
  }

  if (!lastLocUpdate || !lastLocUpdate.location) {
    // Hide passengers icon if geolocation is active and they're not sharing location
    return null;
  }
  return <LianeMemberDisplay location={lastLocUpdate.location} size={40} user={props.user} />;
};
