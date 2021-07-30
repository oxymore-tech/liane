import React, { useCallback, useMemo, useRef, useState } from "react";
import { Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { LatLng, RallyingPoint } from "@/api";
import L, { icon, marker } from "leaflet";
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
  center: LatLng ;
}

export function RallyingPointMarker({ value, from, to, admin, center, onSelect }: RallyingPointMarkerProps) {
  const map = useMap();
  const isFrom = from?.id === value.id;
  const isTo = to?.id === value.id;
  const [newPosition, setNewPosition] = useState(center);

  const iconLookup = () => {
    if (isFrom) return IconBlue;
    if (isTo) return IconRed;
    return IconGray;
  };

  /*
  const theMarker = L.marker([value.position.lat, value.position.lng], {
    draggable: true
  }).addTo(map);

  theMarker.on("dragend", (e) => {
    console.log("drag effectué ! ");
  }); */

  const select = useCallback((fromVsTo: boolean) => {
    onSelect(fromVsTo);
    map.closePopup();
  }, [map]);

  return (
    <Marker
      position={value.position}
      draggable={admin}
      icon={iconLookup()}
      eventHandlers={{ dragend: (e) => {
        const currentMarker = e.target;
        const currentPosition = currentMarker.getLatLng();
        setNewPosition(currentPosition);
      } }}
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
      <Tooltip>
        {value.label}
        <br />
        {newPosition.lat}
        <br />
        {newPosition.lng}
      </Tooltip>
    </Marker>
  );
}
