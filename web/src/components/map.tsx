import React, { memo, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import { featureGroup, icon, LatLngExpression} from "leaflet";
import { RallyingPoint, LatLng, Trip, RouteStat} from "../api";
import { displayService } from "../api/display-service";
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
  { label: "Lundi", value: "Monday" },
  { label: "Mardi", value: "Tuesday" },
  { label: "Mercredi", value: "Wednesday" },
  { label: "Jeudi", value: "Thursday" },
  { label: "Vendredi", value: "Friday" },
  { label: "Samedi", value: "Saturday" },
  { label: "Dimanche", value: "Sunday" },
]

const hours = [
  { label: "0h", value: 0 },
  { label: "1h", value: 1 },
  { label: "2h", value: 2 },
  { label: "3h", value: 3 },
  { label: "4h", value: 4 },
  { label: "5h", value: 5 },
  { label: "6h", value: 6 },
  { label: "7h", value: 7 },
  { label: "8h", value: 8 },
  { label: "9h", value: 9 },
  { label: "10h", value: 10 },
  { label: "11h", value: 11 },
  { label: "12h", value: 12 },
  { label: "13h", value: 13 },
  { label: "14h", value: 14 },
  { label: "15h", value: 15 },
  { label: "16h", value: 16 },
  { label: "17h", value: 17 },
  { label: "18h", value: 18 },
  { label: "19h", value: 19 },
  { label: "20h", value: 20 },
  { label: "21h", value: 21 },
  { label: "22h", value: 22 },
  { label: "23h", value: 23 },
]

const MultiPolyline = ({routes}) => {
  return (routes.map((route, index) =>
  {
  counter += 1;
  var w = route.stat;
  console.log("poids : ", w);
  console.log("indice : ", index);
  var color = "#" + "00" + (Math.floor((1 - route.stat/5) * 255)).toString(16) + (Math.floor((1 - route.stat/5) * 255)).toString(16);
  console.log(color);
  if (w > 1) {
  
    return <MemoPolyline key={counter} positions={route.coordinates} weight={5} color={color}/>
  }
  if (w == 1) {
  return <MemoPolyline key={counter} positions={route.coordinates} weight={2} color={color}/>
  }
  }))
}

var counter = 0;

function  Mapi({className, center, start}: MapProps) {
  const [myStart, setMyStart] = useState(start);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [destinations, setDestinations] = useState<RallyingPoint[]>([]);
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [steps, setSteps] = useState<RallyingPoint[]>([]);

  useEffect(() => {
    setMyStart(start);
  }, [start]);

  useEffect(() => {
    if (myStart) {
      displayService.ListTripsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {setTrips(result)});
      displayService.ListDestinationsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {setDestinations(result)});
      }
      
  }, [myStart]);
  
  useEffect(() => {
    if (trips.length > 0) {
      displayService.ListRoutesEdgesFrom(trips, "Wednesday")
        .then(result => {console.log("ROUTES : ", result); setRoutes(result);});
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
          {/*
            routes.map((route, index) =>
              {
                counter += 1;
              var w = route.stat;
              console.log("poids : ", w);
              console.log("indice : ", index);
              if (w > 1) {
                return <MemoPolyline key={counter} positions={route.coordinates} weight={5}/>
              }
              if (w == 1) {
              return <MemoPolyline key={counter} positions={route.coordinates} weight={2}/>
              }
              })
            
            */<MultiPolyline routes={routes}/>}
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

export default Mapi;