import React, { memo, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import { icon, LatLngExpression, marker} from "leaflet";
import { RallyingPoint, LatLng, Trip} from "../api";
import { displayService } from "../api/display-service";
import { Console } from "console";

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

const customIconRed = icon({
  iconUrl: "/images/leaflet/marker-icon-red.png",
  shadowUrl: "/images/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const MemoPolyline = memo(Polyline);

/*export function getRoutes(trips: Trip[], routesEdges: Map<string, LatLngExpression[][]>){
  console.log("TRIPS HERE: ", trips);
  console.log("ROUTESEDGES HERE: ", routesEdges);
  let routes = [];
  trips.forEach(trip => {
    let route = [];
    trip.coordinates.forEach(
      (point, index)  => {
        if (index != (trip.coordinates.length - 1)) {
          let key = trip.coordinates[index].id + "_" + trip.coordinates[index + 1].id;
          route.push(routesEdges[key]);
        }
      }
    );
    routes.push(<Polyline positions={route.flat()}/>);
  });
  console.log("ROUTES : ", routes);
  return routes
}*/
 
export function getRoutes2(routesEdges: Map<string, LatLngExpression[][]>){
  let routes = [];
  for (const key in routesEdges) {
    routes.push(<Polyline positions={routesEdges[key]}/>);
  }
  return routes;
}

function  Map({className, center, start}: MapProps) {
  const [myStart, setMyStart] = useState(start);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [destinations, setDestinations] = useState<RallyingPoint[]>([]);
  const [routes, setRoutes] = useState<LatLng[][]>([]);
  const [steps, setSteps] = useState<RallyingPoint[]>([]);
  useEffect(() => {
    setMyStart(start);
  }, [start]);

  /*useEffect(() => {
    if (myStart != null) {
      displayService.ListTripsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {setTrips(result)});
    }
  }, [myStart]);*/
  //console.log("TRIPS : ", trips);

  useEffect(() => {
    if (myStart != null) {
      displayService.ListTripsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {setTrips(result)});
      /*if (trips != []) {
        displayService.ListRoutesEdgesFrom(trips).then(
            result => {setRoutes(getRoutes2(result))});
        }*/
      displayService.ListDestinationsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {setDestinations(result)});
      }
      
  }, [myStart]);
  
  useEffect(() => {
    if (trips.length > 0) {
      displayService.ListRoutesEdgesFrom(trips)
        .then(result => setRoutes(result));
      displayService.ListStepsFrom(trips)
        .then(result => setSteps(result));
      }
  }, [trips]);

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
      <div> 
        {
          routes.map((route, index) => (
            <MemoPolyline key={index} positions={route}/>
          ))
        } 
      </div>
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
    {
      myStart &&
      <div>
        {steps.map((point, index) => (
          <Marker key={index} position={point.position} icon={customIconRed} eventHandlers={{
            click: () => {
              setMyStart(point);
                            
            },
          }}>
          </Marker>
        ))}
      </div>
    }
  </MapContainer>;
}

export default Map;