import { MapContainer, MapContainerProps, TileLayer } from "react-leaflet";
import { LatLng } from "@/api";
import ZoomHandler from "@/components/map/ZoomHandler";
import MoveHandler from "@/components/map/MoveHandler";
import React from "react";

interface MapProps extends MapContainerProps {
  onZoomEnd?: (zoomLevel: number) => void;
  onMoveEnd?: (center: LatLng) => void;
  tileServer: string;
}

function Map({ onZoomEnd, onMoveEnd, tileServer, ...props }: MapProps) {
  return <MapContainer {...props}>
    <TileLayer
      url={tileServer}
      zIndex={2}
    />
    { onZoomEnd && <ZoomHandler callback={onZoomEnd}></ZoomHandler>}
    { onMoveEnd && <MoveHandler callback={onMoveEnd}></MoveHandler>}
  </MapContainer>;
}

export default Map;
