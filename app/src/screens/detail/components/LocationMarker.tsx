import React from "react";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";
import { LatLng, TimeInMilliseconds, TimeInSeconds, User, UTCDateTime } from "@liane/common";
import { useRealtimeDelay } from "@/util/hooks/delay";

export const LocationMarker = (props: {
  user: User;
  isCar: boolean;
  info: {
    delay: TimeInMilliseconds;
    position: LatLng;
    isMoving: boolean;
    at: UTCDateTime;
  };
}) => {
  if (!props.info) {
    return null;
  }
  const d = useRealtimeDelay(props.info);
  return (
    <LianeMemberDisplay location={props.info.position} isCar={props.isCar} size={32} user={props.user} delay={d} isMoving={props.info.isMoving} />
  );
};
