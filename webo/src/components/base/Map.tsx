/* eslint-disable react/require-default-props */
import React from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { icon } from "leaflet";

interface MapProps {
  className?: string;
}

const customIcon = icon({
  iconUrl: "/images/leaflet/marker-icon.png",
  shadowUrl: "/images/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function Map({ className }: MapProps) {
  return (
    <MapContainer
      className={className}
      center={[44.3352152, 3.3837138]}
      zoom={14}
      scrollWheelZoom
      dragging={false}
      touchZoom={false}
      style={{ zIndex: 2 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        zIndex={2}
      />
      <Marker position={[44.3352152, 3.3837138]} icon={customIcon}>
        <Popup>
          <h3>Le Moulin de Cénaret</h3>
          <a
            href="https://www.google.com/maps/dir//BJL+Consultants,+31+Avenue+Jean+Fran%C3%A7ois+Champollion,+31100+Toulouse/@43.5472928,1.3944018,19z/data=!4m9!4m8!1m0!1m5!1m1!1s0x12aeb98f54f29755:0xafb963b11ecf5bbf!2m2!1d1.394949!2d43.5472928!3e0"
          >
            Itinéraire
          </a>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export default Map;
