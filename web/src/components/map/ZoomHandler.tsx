import React from "react";
import { useMapEvents } from "react-leaflet";
import { LeafletEvent } from "leaflet";

interface ZoomHandlerProps {
  callback: (number) => void;
}

function ZoomHandler({ callback } : ZoomHandlerProps) {
  useMapEvents({
    zoomstart(o: LeafletEvent) {
      callback(o.target._zoom);
    }
  });

  return (<></>);
}

export default ZoomHandler;
