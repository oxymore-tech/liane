import React from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import { LatLng } from "@/api";

interface MapProps {
  className?: string;
  center: LatLng;
}

function LianeMapAdmin({ className, center }: MapProps) {
  return (
    <div>
      <MapContainer
        className={className}
        center={center}
        zoom={10}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />
      </MapContainer>
    </div>
  );
}

export default LianeMapAdmin;