import { useMemberTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import React from "react";
import { MarkerView } from "../AppMapView";
import { UserPicture } from "@/components/UserPicture";
import { User } from "@/api";

export const DriverLocationMarker = (props: { user: User }) => {
  const lastLocUpdate = useMemberTripGeolocation(props.user.id!);
  if (!lastLocUpdate || !lastLocUpdate.location) {
    return null;
  }

  return (
    <MarkerView id={props.user.id!} coordinate={[lastLocUpdate.location.lng, lastLocUpdate.location.lat]}>
      <UserPicture size={24} url={props.user.pictureUrl} id={props.user.id!} />
    </MarkerView>
  );
};
