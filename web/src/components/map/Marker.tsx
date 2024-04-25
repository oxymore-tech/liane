import { useMapContext } from "@/components/map/Map";
import { PropsWithChildren, useEffect } from "react";
import maplibregl, { LngLatLike } from "maplibre-gl";
import * as React from "react";

type Props = {
  lngLat: LngLatLike;
};

export function Marker({ lngLat }: Props) {
  const map = useMapContext();

  useEffect(() => {
    const m = new maplibregl.Marker().setLngLat(lngLat).addTo(map.current!);
    return () => {
      m.remove();
    };
  }, [lngLat, map]);

  return null;
}
