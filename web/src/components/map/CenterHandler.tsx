import React from "react";
import { useMapEvent } from "react-leaflet";

interface ZoomHandlerProps {
  callback: (LatLng) => void;
}

function CenterHandler({ callback } : ZoomHandlerProps) {
  const map = useMapEvent("moveend", () => {
    callback(map.getCenter());
  });

  return (<></>);
}

export default CenterHandler;
