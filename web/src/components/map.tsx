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
 
function  Map({className, center, start}: MapProps) {
  const [myStart, setMyStart] = useState(start);
  const [myArrival, setMyArrival] = useState(start);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripStarts, setTripStarts] = useState([]);
  const [tripEnds, setTripEnds] = useState([]);
  const [tripStart, setTripStart] = useState();
  const [tripEnd, setTripEnd] = useState();
  const [destinations, setDestinations] = useState<RallyingPoint[]>([]);
  const [routes, setRoutes] = useState<LatLng[][]>([]);
  const [searchedTrips, setSearchedTrips] = useState<any[]>([]);
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
    let index = destinations.findIndex(destination => destination.id == e.value);
    setMyStart(destinations[index]);
    setTripStart(e);
  }

  function updateArrivalTrip(e:any) {
    let index = destinations.findIndex(destination => destination.id == e.value);
    setMyArrival(destinations[index]);
    setTripEnd(e);
  }

  function getTrips() {
    displayService.SearchTrips(myStart, myArrival, tripDay.value, startHour.value, endHour.value).then(
      result => {
        console.log('RESULT : ', result);
        setSearchedTrips(result);
      }
    );
  }

  useEffect(() => {
    if(myStart != null) {
      displayService.ListDestinationsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {
          result.push(myStart);
          setDestinations(result);
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
    }
  }, []);

  useEffect(() => {
    setMyStart(start);
  }, [start]);

  useEffect(() => {   
    if (myStart != null) {
      displayService.ListTripsFrom(myStart.id, myStart.position.lat, myStart.position.lng).then(
        result => {
          setTrips(result)
        });
    }  
  }, [myStart]);
  
  useEffect(() => {
    displayService.ListRoutesEdgesFrom(trips)
      .then(result => {
        setRoutes(result);
      });
    displayService.ListStepsFrom(trips)
      .then(result => {
        setSteps(result);
      });
  }, [trips]);

  return  <div> 
    <div className="container" style={{bottom: 10, left: 10, width: 550, zIndex: 3, position : "absolute"}}>
      <ul className="list-disc">
        <div> 
          {
            searchedTrips.map((search) => (
              <li><strong>UTILISATEUR : {search.user}</strong> - {search.time}h - {search.phone}</li>
            ))
          } 
        </div>
      </ul>
    </div>
    <div className="container" style={{top: 10, right: 10, width: 250, zIndex: 3, position : "absolute"}}>
      <form className="form">
        <div className="row">
          <div className="col-md-4">
            <label>Lieu de départ</label>
            <Select options={ tripStarts } value={tripStart} onChange={updateStartingTrip} placeholder="Sélectionnez un lieu"/>
          </div>
        </div>
        <div className="row">
          <div className="col-md-4">
            <label>Lieu d'arrivée</label>
            <Select options={ tripEnds } value={tripEnd} onChange={updateArrivalTrip} placeholder="Sélectionnez un lieu"/>
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
        <button type="button" className="bg-blue-400 p-2 m-2" onClick={getTrips}>Rechercher</button>
      </form>
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
          {destinations.map((point, index) => {
            const icon = function (myStart:any) {
              if (myStart.id == point.id) {
                return customIcon;
              } else if (myArrival.id == point.id) {
                return customIconRed;
              } else {
                return customIconGray;
              } 
            };
            return (
            <Marker key={index} position={point.position} icon={icon(myStart)} eventHandlers={{
              click: () => {
                let pointData = tripStarts.find(point0 => point0.value === point.id);
                setMyStart(point);         
                setTripStart(pointData);
              },
            }}>
            </Marker>
          )
        })}
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
    </MapContainer>
    </div>
}

export default Map;