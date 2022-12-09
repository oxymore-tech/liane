import React, { useState } from "react";
import "leaflet/dist/leaflet.css";
import { LatLng, RallyingPoint } from "@/api";
import Map from "@/components/map/Map";
import dynamic from "next/dynamic";

const Mapi = dynamic(() => import("@/components/map/Map"), { ssr: false });

interface MapProps {
  className?: string;
  defaultCenter: LatLng;
}

function MapManager({ className, defaultCenter }: MapProps) {
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [center, setCenter] = useState<LatLng>(center);
  
  const handleCenter = (c: LatLng) => {
    console.log(c);
  };
  
  const handleZoom = (z: number) => {
    console.log(z);
  };

  return (
    <div className="relative">
      <Mapi
        className={className}
        center={center}
        zoom={12}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
        tileServer="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        onZoomEnd={handleZoom}
        onMoveEnd={handleCenter}
      >
        { showRallyingPoints
          && rallyingPoints.map((point: RallyingPoint) => (
            <RallyingPointMarker
              from={from}
              to={to}
              key={`rl_${point.id}`}
              value={point}
              onSelect={(isFrom: boolean) => { handleRp(point, isFrom); }}
            />
          ))}
      </Mapi>
    </div>
  );
}

export default MapManager;
