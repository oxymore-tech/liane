import React, { useState } from "react";
import "leaflet/dist/leaflet.css";
import { LatLng, RallyingPoint } from "@/api";

const ZOOM_LEVEL_TO_SHOW_RP: number = 12;

interface MapProps {
  className?: string;
  center: LatLng;
}

function LianeMap({ className, center }: MapProps) {
  // Map features to display
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Map display options
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);
  const [lastCenter, setLastCenter] = useState<LatLng>(center);
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();

  // Handle map interactions

  const handleZoom = (zoom: number) => {
    setShowRallyingPoints(zoom >= ZOOM_LEVEL_TO_SHOW_RP);
  };

  const handleRp = (rp: RallyingPoint, isFrom: boolean) => {
    if (isFrom) {
      setFrom(rp);
    } else {
      setTo(rp);
    }
  };

  return (
    <div className="relative">
      <Map
        className={className}
        center={center}
        zoom={12}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >

      </Map>
    </div>
  );
}

export default LianeMap;
