"use client";

import React, { createContext, PropsWithChildren, useContext, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_TLS, getMapStyleUrl, LatLng } from "@liane/common";
import { NodeAppEnv } from "@/api/env";

export type MapProps = {
  // onZoomEnd?: (zoom: number) => void;
  // onMoveEnd?: (center: LatLng) => void;
  center?: LatLng;
} & PropsWithChildren;

// @ts-ignore
const MapContext = createContext<React.MutableRefObject<maplibregl.Map | undefined>>();

export const useMapContext = () => {
  return useContext(MapContext);
};
function Map({ children, center }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map>();
  useEffect(() => {
    if (map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: getMapStyleUrl(NodeAppEnv),
      center: center ? [center.lng, center.lat] : [DEFAULT_TLS.lng, DEFAULT_TLS.lat],
      zoom: 12
    });
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
  }, [mapContainer]);

  useEffect(() => {
    if (!map.current || !center) return;
    map.current.setCenter([center.lng, center.lat]);
  }, [center]);

  return (
    <div className="h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      <MapContext.Provider value={map}>{children}</MapContext.Provider>
    </div>
  );
}

export default Map;
