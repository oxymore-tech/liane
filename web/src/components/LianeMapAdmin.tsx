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
      <div className="absolute inset-y-0 right-0 z-10">
        <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-10 gap-2 m-10">
          Ici on mettra les filtres
        </div>
      </div>

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