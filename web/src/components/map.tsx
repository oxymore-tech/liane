import React from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import { icon} from "leaflet";
import { RallyingPoint, LatLng} from "../api";
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

export function printTrips(start: RallyingPoint) {
  let routes = [];
  displayService.ListTripsFrom(start.id, start.position.lat, start.position.lng).then(
    trips => {
      trips.forEach(trip => {
          let route = [];
          trip.coordinates.forEach(point => {
              route.push([point.position.lat, point.position.lng]);
            }
          );
          routes.push(<Polyline positions={route}/>);
        }
      );
    }
  );
  return routes;
  //return [<Polyline positions={[[44.5, 3.5], [44.4, 3.6]]}/>, <Polyline positions={[[44, 3], [45, 4]]}/>];
}

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
      <div> { printTrips(start) } </div>
    }
    <Polyline positions={[[44.5180226, 3.4991057], [44.38624954223633, 3.6189568042755127], [44.31901305, 3.57802065202088]]} 
              color={"#ff0000"} 
              weight={10}/>
  </MapContainer>;
}

export default Map;