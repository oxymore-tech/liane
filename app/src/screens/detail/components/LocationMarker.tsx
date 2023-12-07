import React from "react";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";
import { AppLogger } from "@/api/logger";
import { User } from "@liane/common";
import { useMemberTripGeolocation } from "@/screens/detail/TripGeolocationProvider";

export const LocationMarker = (props: { user: User }) => {
  const lastLocUpdate = useMemberTripGeolocation(props.user.id!);

  AppLogger.debug("GEOLOC", `${props.user.pseudo}:`, lastLocUpdate);
  if (!lastLocUpdate || !lastLocUpdate.location) {
    return null;
  }

  return (
    <LianeMemberDisplay location={lastLocUpdate.location} size={32} user={props.user} delay={lastLocUpdate.delay} isMoving={lastLocUpdate.isMoving} />
  );
};
