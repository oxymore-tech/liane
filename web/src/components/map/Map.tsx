"use client";

import React, { createContext, PropsWithChildren, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import maplibregl, { MapMouseEvent, MapOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_TLS, getMapStyleUrl, LatLng } from "@liane/common";
import { NodeAppEnv } from "@/api/env";

export type MapProps = {
  center?: LatLng;
  onZoom?: (zoom: number) => void;
  onClick?: (e: MapMouseEvent) => void;
} & PropsWithChildren;

// @ts-ignore
const MapContext = createContext<React.MutableRefObject<MapImpl | null>>();

export const useMapContext = () => {
  return useContext(MapContext);
};

class MapImpl extends maplibregl.Map {
  constructor(options: MapOptions) {
    super(options);
  }

  private imageListeners: { [k: string]: (() => void)[] } = {};

  public loadGlobalImage(path: string, name: string, onLoaded?: () => void) {
    if (onLoaded) {
      if (this.hasImage(name)) onLoaded();
      else this.imageListeners[name] = [...(this.imageListeners[name] ?? []), onLoaded];
    }
    this.loadImage(path, (error, image) => {
      if (error) throw error;
      if (!image) console.warn("No image found");
      else if (!this.hasImage(name)) {
        this.addImage(name, image, { sdf: true });
        console.log("loaded", name);
        this.imageListeners[name]?.forEach(l => l());
      }
    });
  }
}

const Map = React.forwardRef<MapImpl | null, MapProps>(({ children, center, onZoom, onClick }: MapProps, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapImpl | null>(null);
  const [ready, setReady] = useState(false);
  useImperativeHandle<MapImpl | null, MapImpl | null>(ref, () => map.current);
  useEffect(() => {
    if (map.current) return;
    map.current = new MapImpl({
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
