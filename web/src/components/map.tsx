import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import { icon, LatLngExpression} from "leaflet";
import { RallyingPoint, LatLng, Trip} from "../api";
import { displayService } from "../api/display-service";

interface MapProps {
  className?: string;
  center: LatLng;
  start?: RallyingPoint;
}

const customIcon = icon({
  iconUrl: "/images/leaflet/marker-icon.png",
  shadowUrl: "/images/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export function getRoutes(trips: Trip[]) {
  let routes = [];
  trips.forEach(trip => {
    let route = [];
    trip.coordinates.forEach(point => {
        route.push([point.position.lat, point.position.lng]);
      }
    );
    routes.push(<Polyline positions={route}/>);
  });
  return routes
}


function Map({className, center, start}: MapProps) {
  const [routes, setRoutes] = useState<LatLngExpression[][]>();
  useEffect(() => {
    if (start != null) {
      displayService.ListTripsFrom(start.id, start.position.lat, start.position.lng).then(
        result => setRoutes(getRoutes(result)))
      }
  }, [start]);
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
    {
      start && 
      <Marker position={start.position} icon={customIcon}>
        <Popup>
          <h3>{start.id}</h3>
        </Popup>
      </Marker>
    }
    {
      start &&
      <div> { routes } </div>
    }
    <Polyline positions={[[44.5180226, 3.4991057], [44.38624954223633, 3.6189568042755127], [44.31901305, 3.57802065202088]]} 
              color={"#00ff00"} 
              weight={5}/>
  </MapContainer>;
}

export default Map;