import React, { memo, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import { icon, LatLngExpression} from "leaflet";
import { RallyingPoint, LatLng, Trip} from "../api";
import { displayService } from "../api/display-service";
import Select from "react-select";
import { days, hours } from "../../assets/time.data";

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
  const [tripStarts, setTripStarts] = useState([]);
  const [tripEnds, setTripEnds] = useState([]);
  const [tripStart, setTripStart] = useState();
  const [tripEnd, setTripEnd] = useState();
  const [destinations, setDestinations] = useState<RallyingPoint[]>([]);
  const [routes, setRoutes] = useState<LatLng[][]>([]);
  const [steps, setSteps] = useState<RallyingPoint[]>([]);
  const [tripDay, setTripDay] = useState(days.find(jour => {
    let date = new Date();
    return date.getDay() == jour.value;
  }));
  const [startHours, ] = useState(hours);
  const [endHours, setEndHours] = useState(hours);
  const [startHour, setStartHour] = useState(hours.find(heure => {
    let date = new Date();
    return date.getHours() == heure.value;
  }));
  const [endHour, setEndHour] = useState(hours.find(heure => {
    let date = new Date();
    return date.getHours()+1 == heure.value;
  }));

  function updateEndHours(e:any) {
    const newEndHours = e.value != 23 ? hours.filter(hour => hour.value > e.value) : hours;
    setEndHour(newEndHours[0]);
    setStartHour(e);
    setEndHours(newEndHours);
  }

  function updateStartingTrip(e:any) {
    let index = destinations.findIndex(destination => destination.id = e.value);
    console.log('RALLYING POINT : ', destinations[index]);
    setMyStart(destinations[index]);
    setTripStart(e);
  }

  useEffect(() => {
    displayService.ListDestinationsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
      result => {
        setDestinations(result)
        let tripsList = [];
        result.forEach(city => {
          tripsList.push({
            label : city.id.replaceAll('_', ' '),
            value : city.id
          });
        });
        setTripStarts(tripsList);
        setTripEnds(tripsList);
    });
  }, []);

  useEffect(() => {
    setMyStart(start);
  }, [start]);

  useEffect(() => {   
    if (myStart != null) {
      displayService.ListTripsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {setTrips(result)});
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
    <div className="container" style={{top: 10, right: 10, width: 250, zIndex: 3, position : "absolute"}}>
      <div className="row">
        <div className="col-md-4">
          <label>Lieu de départ</label>
          <Select options={ tripStarts } value={tripStart} onChange={updateStartingTrip} placeholder="Sélectionnez un lieu"/>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <label>Lieu d'arrivée</label>
          <Select options={ tripEnds } value={tripEnd} onChange={setTripEnd} placeholder="Sélectionnez un lieu"/>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <label>Jour</label>
          <Select options={ days } value={tripDay} onChange={setTripDay} placeholder="Sélectionnez un jour"/>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <label>Départ entre :</label>
          <Select options={ startHours } value={startHour} onChange={updateEndHours} placeholder="Sélectionnez une heure"/>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <label>et :</label>
          <Select options={ endHours } value={endHour} onChange={setEndHour} placeholder="Sélectionnez une heure"/>
        </div>
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
                let pointData = tripStarts.find(point0 => point0.value == point.id);
                setMyStart(point);         
                setTripStart(pointData);
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
                let pointData = tripStarts.find(point0 => point0.value == point.id);
                setTripStart(pointData);
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