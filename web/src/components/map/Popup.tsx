import * as React from "react";
import { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import maplibregl, { LngLatLike, PositionAnchor } from "maplibre-gl";
import { useMapContext } from "@/components/map/Map";
import { createRoot } from "react-dom/client";

type Props = {
  lngLat: LngLatLike;
  anchor?: PositionAnchor;
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

export function PopupContainer({ children, lngLat, anchor }: Props) {
  const map = useMapContext();

  const placeholder = useMemo(() => {
    const placeholder = document.createElement("div");
    createRoot(placeholder).render(<>{children}</>);
    return placeholder;
  }, [children]);

  useEffect(() => {
    const popup = new maplibregl.Popup({ closeButton: false, className: "map-popup-container", anchor })
      .setLngLat(lngLat)
      .setDOMContent(placeholder)
      .addTo(map.current!);
    return () => {
      popup.remove();
    };
  }, [placeholder, lngLat, map, anchor]);

  return null;
}
