import React, { useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  LatLng,
  RallyingPoint
} from "@/api";
import { RallyingPointService } from "@/api/services/rallying-point-service";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";
import Map from "@/components/map/Map";

interface MapAdminProps {
  className?: string;
  defaultCenter: LatLng;
}

function LianeMapAdmin({ className, defaultCenter }: MapAdminProps) {
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);

  const handleCenter = (c: LatLng) => {
    RallyingPointService.list(c.lat, c.lng).then((r) => {
      setRallyingPoints(r);
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleZoom = (z: number) => {
    // Nothing yet
  };
  
  return (<div className="relative">
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
      points={rallyingPoints.map((rp: RallyingPoint) => (
        <RallyingPointMarker
          key={rp.id}
          rallyingPoint={rp}
          editMode
        />
      ))}
    />
  </div>
  );
}

export default LianeMapAdmin;
