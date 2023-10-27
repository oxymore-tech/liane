import { useMemberIsMoving } from "@/screens/detail/TripGeolocationProvider";
import React from "react";
import { User } from "@/api";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";
import { AppLogger } from "@/api/logger";

export const LocationMarker = (props: { user: User }) => {
  const lastLocUpdate = useMemberIsMoving(props.user.id!);

  AppLogger.debug("GEOLOC", `${props.user.pseudo}:`, lastLocUpdate);
  if (!lastLocUpdate || !lastLocUpdate.location) {
    return null;
  }

  return (
    <LianeMemberDisplay location={lastLocUpdate.location} size={32} user={props.user} delay={lastLocUpdate.delay} isMoving={lastLocUpdate.moving} />
  );
};
