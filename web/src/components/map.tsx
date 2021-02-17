import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import { icon, LatLngExpression, marker} from "leaflet";
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

const customIconGray = icon({
  iconUrl: "/images/leaflet/marker-icon-gray.png",
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
  const [myStart, setMyStart] = useState(start);
  const [routes, setRoutes] = useState<LatLngExpression[][]>([]);
  const [destinations, setDestinations] = useState<RallyingPoint[]>([]);
  useEffect(() => {
    setMyStart(start);
  }, [start]);
  useEffect(() => {
    if (myStart != null) {
      displayService.ListTripsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => setRoutes(getRoutes(result)));
      displayService.ListDestinationsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {setDestinations(result)});
      }
  }, [myStart]);
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
      myStart && 
      <Marker position={myStart.position} icon={customIcon}>
        <Popup>
          <h3>{myStart.id}</h3>
        </Popup>
      </Marker>
    }
    {
      myStart &&
      <div> { routes } </div>
    }
    {
      myStart &&
      <div>
        {destinations.map((point, index) => (
          <Marker key={index} position={point.position} icon={customIconGray} eventHandlers={{
            click: () => {
              setMyStart(point);
                            
            },
          }}>
          </Marker>
        ))}
      </div>
        }
    {/*<Polyline positions={[[44.5180226, 3.4991057], [44.38624954223633, 3.6189568042755127], [44.31901305, 3.57802065202088]]} 
              color={"#00ff00"} 
      weight={5}/>*/}
  </MapContainer>;
}

export default Map;