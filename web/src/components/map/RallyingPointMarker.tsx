import React, { useCallback, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import { LatLng, RallyingPoint } from "@/api";
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
  onSelect?: (fromVsTo: boolean) => void;
  editMode?: boolean;
}

export function RallyingPointMarker({ value, from, to, editMode, onSelect }: RallyingPointMarkerProps) {
  const map = useMap();
  const isFrom = from?.id === value.id;
  const isTo = to?.id === value.id;

  const [pos, setPos] = useState<LatLng>(value.location);
  const [newPos, setNewPos] = useState<LatLng>();
  const [isActive, setIsActive] = useState(value.isActive);

  const toggleIsActive = async () => {
    // await RallyingPointService.state(value.id, !isActive);
    setIsActive(!isActive);
    map.closePopup();
  };

  const cancelPos = async () => {
    setPos({ lat: pos.lat, lng: pos.lng + 0.000001 } as LatLng); // Trick the component to re-render
    setNewPos(undefined);
    map.closePopup();
  };

  const confirmPos = async () => {
    if (newPos) {
      // await RallyingPointService.move(value.id, newPos.lat, newPos.lng);
      setPos(newPos);
      setNewPos(undefined);
    }
    map.closePopup();
  };

  // Marker display functions

  const select = useCallback((fromVsTo: boolean) => {
    if (onSelect) onSelect(fromVsTo);
    map.closePopup();
  }, [map]);

  const iconLookup = () => {
    if (isFrom) return IconBlue;
    if (isTo) return IconRed;
    return IconGray;
  };

  return (
    <Marker
      position={pos}
      draggable={editMode}
      icon={iconLookup()}
      eventHandlers={
        { dragend: (e) => { setNewPos(e.target.getLatLng()); } }
      }
    >
      <Popup closeButton={false}>
        <Label className="text-center border-b">
          {value.label}
        </Label>
        { editMode
          ? (
            <div className="w-31 flex flex-col">
              { isActive
                ? <PopupMenuItem text="Désactiver" onSelect={toggleIsActive} />
                : <PopupMenuItem text="Activer" onSelect={toggleIsActive} />}
              { newPos
                ? (
                  <div>
                    <PopupMenuItem text="Annuler le déplacement" onSelect={cancelPos} />
                    <PopupMenuItem text="Enregistrer le déplacement" onSelect={confirmPos} />
                  </div>
                ) : null}
            </div>
          ) : (
            <div className="w-28 flex flex-col">
              <PopupMenuItem text="Départ" selected={isFrom} onSelect={() => select(true)} img="/images/leaflet/marker-icon.png" />
              <PopupMenuItem text="Arrivée" selected={isTo} onSelect={() => select(false)} img="/images/leaflet/marker-icon-red.png" />
            </div>
          )}
      </Popup>
    </Marker>
  );
}
