import React, { useCallback } from "react";
import { Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { RallyingPoint } from "@/api";
import { icon } from "leaflet";
import { PopupMenuItem } from "@/components/PopupMenuItem";
import { Label } from "@/components/base/Label";

export const IconBlue = icon({
  iconUrl: "/images/leaflet/marker-icon.png",
  shadowUrl: "/images/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const IconGray = icon({
  iconUrl: "/images/leaflet/marker-icon-gray.png",
  shadowUrl: "/images/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const IconRed = icon({
  iconUrl: "/images/leaflet/marker-icon-red.png",
  shadowUrl: "/images/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export interface RallyingPointMarkerProps {
  value: RallyingPoint;
  from?: RallyingPoint;
  to?: RallyingPoint;
  admin: boolean;
  onSelect: (fromVsTo:boolean) => void;
}

export function RallyingPointMarker({ value, from, to, admin, onSelect }: RallyingPointMarkerProps) {
  const map = useMap();
  const isFrom = from?.id === value.id;
  const isTo = to?.id === value.id;

  const iconLookup = () => {
    if (isFrom) return IconBlue;
    if (isTo) return IconRed;
    return IconGray;
  };

  const select = useCallback((fromVsTo: boolean) => {
    onSelect(fromVsTo);
    map.closePopup();
  }, [map]);

  return (
    <Marker
      position={value.position}
      draggable={admin}
      icon={iconLookup()}
    >
      <Popup closeButton={false}>
        <Label className="text-center pb-2 mb-2 border-b">
          {value.label}
        </Label>
        <div className="w-28 flex flex-col">
          <PopupMenuItem text="Départ" selected={isFrom} onSelect={() => select(true)} img="/images/leaflet/marker-icon.png" />
          <PopupMenuItem text="Arrivée" selected={isTo} onSelect={() => select(false)} img="/images/leaflet/marker-icon-red.png" />
        </div>
      </Popup>
      <Tooltip>{value.label}</Tooltip>
    </Marker>
  );
}
