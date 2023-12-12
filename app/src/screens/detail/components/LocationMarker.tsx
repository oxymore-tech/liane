import React from "react";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";
import { LatLng, TimeInSeconds, User, UTCDateTime } from "@liane/common";
import { useRealtimeDelay } from "@/util/hooks/delay";

export const LocationMarker = (props: {
  user: User;
  info: {
    delay: TimeInSeconds;
    position: LatLng;
    isMoving: boolean;
    at: UTCDateTime;
  };
}) => {
  if (!props.info) {
    return null;
  }
  const d = useRealtimeDelay(props.info);
  return <LianeMemberDisplay location={props.info.position} size={32} user={props.user} delay={d} isMoving={props.info.isMoving} />;
};
