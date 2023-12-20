"use client";

import React, { createContext, PropsWithChildren, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import maplibregl, { MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_TLS, getMapStyleUrl, LatLng } from "@liane/common";
import { NodeAppEnv } from "@/api/env";

export type MapProps = {
  center?: LatLng;
  onZoom?: (zoom: number) => void;
  onClick?: (e: MapMouseEvent) => void;
} & PropsWithChildren;

// @ts-ignore
const MapContext = createContext<React.MutableRefObject<maplibregl.Map | null>>();

export const useMapContext = () => {
  return useContext(MapContext);
};
const Map = React.forwardRef<maplibregl.Map | null, MapProps>(({ children, center, onZoom, onClick }: MapProps, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  useImperativeHandle<maplibregl.Map | null, maplibregl.Map | null>(ref, () => map.current);
  useEffect(() => {
    if (map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: getMapStyleUrl(NodeAppEnv),
      center: center ? [center.lng, center.lat] : [DEFAULT_TLS.lng, DEFAULT_TLS.lat],
      zoom: 12
    });
    const control = new maplibregl.NavigationControl();
    map.current.addControl(control, "top-right");
    setReady(true);
  }, [mapContainer]);

  useEffect(() => {
    if (!onZoom) return;
    const listener = () => {
      onZoom(map.current!.getZoom());
    };
    map.current?.on("zoom", listener);
    return () => {
      map.current?.off("zoom", listener);
    };
  }, [onZoom]);

  useEffect(() => {
    if (!map.current || !center) return;
    map.current.setCenter([center.lng, center.lat]);
  }, [center]);

  useEffect(() => {
    if (!map.current || !onClick) return;

    map.current.on("click", onClick);
    return () => {
      map.current?.off("click", onClick);
    };
  }, [onClick]);

  return (
    <div ref={mapContainer} className="h-full w-full relative">
      {ready ? <MapContext.Provider value={map}>{children}</MapContext.Provider> : null}
    </div>
  );
});

Map.displayName = "Map";

export default Map;
