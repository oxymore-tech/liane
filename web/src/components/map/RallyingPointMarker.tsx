import React, { useCallback, useState } from "react";
import { Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { LatLng, RallyingPoint } from "@/api";
import { icon } from "leaflet";
import { PopupMenuItem } from "@/components/PopupMenuItem";
import { Label } from "@/components/base/Label";
import { Button } from "@/components/base/Button";
import { TripService } from "@/api/services/trip-service";

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
  edible?: boolean;
  active : boolean ;
}

export function RallyingPointMarker({ value, from, to, admin, edible, onSelect, active }: RallyingPointMarkerProps) {
  const map = useMap();
  const firstPosition = value.coordinates;
  const isFrom = from?.id === value.id;
  const isTo = to?.id === value.id;
  const [newPosition, setNewPosition] = useState(null);
  const [isActive, setIsActive] = useState<boolean>(active);

  const iconLookup = () => {
    if (isFrom) return IconBlue;
    if (isTo) return IconRed;
    return IconGray;
  };

  const cancelRPmodification = () => {
    // Remettre le point de ralliement à sa position initiale (celle renseignée en BD)
    // Il faut au préalable avoir enregistré la première position quelque part

    setNewPosition(firstPosition);
  };

  const saveNewPosition = () => {
    // Faire la requête pour enregistrer dans la BD la nouvelle position
  };

  const updateIsActive = () => {
    setIsActive(!isActive);
    // Faire la requête pour que le point soit actif/inactif en BD
  };

  const select = useCallback((fromVsTo: boolean) => {
    onSelect(fromVsTo);
    map.closePopup();
  }, [map]);

  return (
    <Marker
      position={value.coordinates}
      draggable={edible}
      icon={iconLookup()}
      eventHandlers={{ dragend: (e) => {
        const currentMarker = e.target;
        const currentPosition = currentMarker.getLatLng();
        setNewPosition(currentPosition);
      } }}
    >
      {newPosition ? null : null}
      <Popup closeButton={false}>
        <Label className="text-center pb-2 mb-2 border-b">
          {value.label}
        </Label>
        {
          edible ? (
            <div className="w-31 flex flex-col">
              { isActive
                ? <PopupMenuItem text="Désactiver le rallying point" selected={isActive} onSelect={updateIsActive} img="/images/leaflet/marker-icon.png" />
                : <PopupMenuItem text="Activer le rallying point" selected={isActive} onSelect={updateIsActive} img="/images/leaflet/marker-icon.png" />}
              { newPosition
                ? (
                  <div>
                    <PopupMenuItem text="Annuler le déplacement" selected={newPosition === true} onSelect={cancelRPmodification} img="/images/leaflet/marker-icon.png" />
                    <PopupMenuItem text="Enregistrer la nouvelle position" selected={newPosition === true} onSelect={saveNewPosition} img="/images/leaflet/marker-icon.png" />
                  </div>
                ) : null}
            </div>
          ) : (
            <div className="w-28 flex flex-col">
              <PopupMenuItem text="Départ" selected={isFrom} onSelect={() => select(false)} img="/images/leaflet/marker-icon.png" />
              <PopupMenuItem text="Arrivée" selected={isTo} onSelect={() => select(false)} img="/images/leaflet/marker-icon-red.png" />
            </div>
          )
        }

      </Popup>
      <Tooltip>
        {value.label}
        <br />
        {newPosition ? newPosition.lat : value.coordinates.lat}
        <br />
        {newPosition ? newPosition.lng : value.coordinates.lng}
      </Tooltip>
    </Marker>
  );
}
