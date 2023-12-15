import * as React from "react";
import { PropsWithChildren, useEffect, useRef } from "react";
import maplibregl, { LngLatLike } from "maplibre-gl";
import { useMapContext } from "@/components/map/Map";

type Props = {
  lngLat: LngLatLike;
} & PropsWithChildren;

export function Popup({ children, lngLat }: Props) {
  const map = useMapContext();
  const popupRef = useRef(null);

  useEffect(() => {
    const popup = new maplibregl.Popup({ className: "text-slate-950" }).setLngLat(lngLat).setDOMContent(popupRef.current!).addTo(map.current!);
    return () => {
      popup.remove();
    };
  }, [lngLat, map, popupRef]);

  return (
    <div style={{ display: "none" }}>
      <div ref={popupRef}>{children}</div>
    </div>
  );
}
