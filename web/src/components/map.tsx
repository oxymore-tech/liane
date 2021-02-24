import React, { memo, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import { icon, LatLngExpression, marker} from "leaflet";
import { RallyingPoint, LatLng, Trip} from "../api";
import { displayService } from "../api/display-service";
import { Console } from "console";
import { relative } from "path";
import Select from "react-select";

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

const days = [
  { label: "Lundi", value: 1 },
  { label: "Mardi", value: 2 },
  { label: "Mercredi", value: 3 },
  { label: "Jeudi", value: 4 },
  { label: "Vendredi", value: 5 },
  { label: "Samedi", value: 6 },
  { label: "Dimanche", value: 7 },
]

const hours = [
  { label: "0h", value: 1 },
  { label: "1h", value: 2 },
  { label: "2h", value: 3 },
  { label: "3h", value: 4 },
  { label: "4h", value: 5 },
  { label: "5h", value: 6 },
  { label: "6h", value: 7 },
  { label: "7h", value: 8 },
  { label: "8h", value: 9 },
  { label: "9h", value: 10 },
  { label: "10h", value: 11 },
  { label: "11h", value: 12 },
  { label: "12h", value: 13 },
  { label: "13h", value: 14 },
  { label: "14h", value: 15 },
  { label: "15h", value: 16 },
  { label: "16h", value: 17 },
  { label: "17h", value: 18 },
  { label: "18h", value: 19 },
  { label: "19h", value: 20 },
  { label: "20h", value: 21 },
  { label: "21h", value: 22 },
  { label: "22h", value: 23 },
  { label: "23h", value: 24 },
]

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
  const [value, setValue] = useState(0);
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

  return  <div> 
      <div className="container">
      <div className="row" style={{top: 10, right: 10, width: 250, zIndex: 3, position : "absolute"}}>
        <div className="col-md-4"></div>
        <div className="col-md-4">
          <Select options={ days } placeholder="Sélectionnez un jour"/>
        </div>
        <div className="col-md-4"></div>
      </div>
    </div>
    <div className="container">
      <div className="row" style={{top: 60, right: 10, width: 250, zIndex: 2, position : "absolute"}}>
        Départ entre :
        <div className="col-md-4"></div>
        <div className="col-md-4">
          <Select options={ hours } placeholder="Sélectionnez une heure"/>
        </div>
        <div className="col-md-4"></div>
      </div>
    </div>
    <div className="container">
      <div className="row" style={{top: 130, right: 10, width: 250, zIndex: 1, position : "absolute"}}>
        et :
        <div className="col-md-4"></div>
        <div className="col-md-4">
          <Select options={ hours } placeholder="Sélectionnez une heure"/>
        </div>
        <div className="col-md-4"></div>
      </div>
    </div>
      <MapContainer className={className} center={center}
                        zoom={12}
                        scrollWheelZoom={true}
                        dragging={true}
                        touchZoom={false}
                        style={{zIndex: 0, position : "relative"}}>
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
    </div>
}

export default Map;