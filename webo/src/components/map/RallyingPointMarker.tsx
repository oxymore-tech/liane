import React, { useEffect, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import { RallyingPoint } from "@/api";
import { icon } from "leaflet";
import { PopupMenuItem } from "@/components/PopupMenuItem";
import { Label } from "@/components/base/Label";
import { RallyingPointService } from "@/api/services/rallying-point-service";

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

const getIcon = (isActive: boolean) => {
  if (!isActive) return IconRed;
  return IconGray;
};

export interface RallyingPointMarkerProps {
  rallyingPoint: RallyingPoint;
  editMode?: boolean;
}

export function RallyingPointMarker({ rallyingPoint, editMode }: RallyingPointMarkerProps) {
  const map = useMap();
  const id = rallyingPoint.id;
  const label = rallyingPoint.label;
  const [lat, setLat] = useState(rallyingPoint.location.lat);
  const [lng, setLng] = useState(rallyingPoint.location.lng);
  const [isActive, setIsActive] = useState(rallyingPoint.isActive);
    
  useEffect(() => {
    RallyingPointService.update(id!, label, lat, lng, isActive).then(r => console.log("Updated! " + r));
  }, [id, label, lat, lng, isActive]);

  const toggleIsActive = () => {
    setIsActive(!isActive);
    map.closePopup();
  };
  
  const setPos = (p) => {
    setLat(p.lat);
    setLng(p.lng);
  };

  return (
    <Marker
      position={{ lat, lng }}
      draggable={editMode}
      icon={getIcon(isActive)}
      eventHandlers={
        { dragend: (e) => { setPos(e.target.getLatLng()); } }
      }
    >
      <Popup closeButton={false}>
        <Label className="text-center border-b">
          {label}
        </Label>
        { editMode && (
            <div className="w-31 flex flex-col">
              { isActive
                ? <PopupMenuItem text="Désactiver" onSelect={toggleIsActive} />
                : <PopupMenuItem text="Activer" onSelect={toggleIsActive} />
              }
            </div>
        )}
      </Popup>
    </Marker>
  );
}
