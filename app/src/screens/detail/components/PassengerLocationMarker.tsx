import { useMemberTripGeolocation, useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import React from "react";
import { LatLng, User } from "@/api";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";

export const PassengerLocationMarker = (props: { user: User; defaultLocation: LatLng }) => {
  const lastLocUpdate = useMemberTripGeolocation(props.user.id!);
  const geoloc = useTripGeolocation();
  if (!geoloc) {
    return <LianeMemberDisplay location={props.defaultLocation} size={40} user={props.user} minZoom={6} showLocationPin={false} />;
  }

  if (!lastLocUpdate || !lastLocUpdate.location) {
    // Hide passengers icon if geolocation is active and they're not sharing location
    return null;
  }

  return <LianeMemberDisplay location={props.defaultLocation} size={40} user={props.user} />;
};