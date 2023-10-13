import React from "react";
import { useMapEvent } from "react-leaflet";

interface MoveHandlerProps {
  callback: (LatLng) => void;
}

function MoveHandler({ callback } : MoveHandlerProps) {
  const map = useMapEvent("moveend", () => {
    callback(map.getCenter());
  });

  return (<></>);
}

export default MoveHandler;
