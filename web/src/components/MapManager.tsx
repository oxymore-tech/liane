import React, { useState } from "react";
import "leaflet/dist/leaflet.css";
import { LatLng, RallyingPoint } from "@/api";
import Map from "@/components/map/Map";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";
import { RallyingPointService } from "@/api/services/rallying-point-service";

interface MapManagerProps {
  className?: string;
  defaultCenter: LatLng;
}

function MapManager({ className, defaultCenter }: MapManagerProps) {
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  
  const handleCenter = (c: LatLng) => {
    RallyingPointService.list(c.lat, c.lng).then((r) => {
      setRallyingPoints(r);
      console.log(r);
    });
  };
  
  const handleZoom = (z: number) => {
    console.log(z);
  };

  return (
    <div className="relative">
      <Map
        className={className}
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
        tileServer="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        onZoomEnd={handleZoom}
        onMoveEnd={handleCenter}
      >
        { rallyingPoints.map((rp: RallyingPoint) => (
            <RallyingPointMarker
              key={rp.id}
              value={rp}
            />
        ))}
      </Map>
    </div>
  );
}

export default MapManager;
