import React from "react";
import { useMapEvent } from "react-leaflet";

interface ZoomHandlerProps {
  callback: (number) => void;
}

function ZoomHandler({ callback } : ZoomHandlerProps) {
  const map = useMapEvent("zoomend", () => {
    callback(map.getZoom());
  });

  return (<></>);
}

export default ZoomHandler;
