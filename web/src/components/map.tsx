import React from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import { icon} from "leaflet";
import { LabeledPosition, LatLng} from "../api";

interface MapProps {
  className?: string;
  center: LatLng;
  start?: LabeledPosition;
}

const customIcon = icon({
  iconUrl: "/images/leaflet/marker-icon.png",
  shadowUrl: "/images/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function Map({className, center, start}: MapProps) {

  return <MapContainer className={className} center={center}
                       zoom={12}
                       scrollWheelZoom={true}
                       dragging={true}
                       touchZoom={false}
                       style={{zIndex: 2}}>
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      zIndex={2}

    />
    {start && <Marker position={start.position} icon={customIcon}>
      <Popup>
        <h3>{start.label}</h3>
      </Popup>
    </Marker>}
    
    <Polyline positions={[[44.5180226, 3.4991057], [44.38624954223633, 3.6189568042755127], [44.31901305, 3.57802065202088]]} 
              color={"#ff0000"} 
              weight={10}/>
  </MapContainer>;
}

export default Map;