import React, { memo, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import { icon } from "leaflet";
import { displayService } from "@api/display-service";
import { Days, Hours } from "@api/time";
import { Select } from "@components/base/Select";
import {
  DayOfWeek, LatLng, RallyingPoint, RouteStat, Trip
} from "../api";
import { Button } from "./base/Button";
import { AvailableTrips } from "./available_trips";

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

const MultiPolyline = ({ routes }: { routes:RouteStat[] }) => (
  <>
    {routes
      .map((route, i) => {
        const w = route.stat;
        const color = `#${(Math.floor((1 - route.stat / 7) * 255)).toString(16)}${(Math.floor((route.stat / 7) * 255)).toString(16)}00`;
        if (w >= 6) {
          return <MemoPolyline key={i} positions={route.coordinates} weight={10} color={color} />;
        }
        if (w > 1 && w < 6) {
          return <MemoPolyline key={i} positions={route.coordinates} weight={5} color={color} />;
        }
        if (w === 1) {
          return <MemoPolyline key={i} positions={route.coordinates} weight={2} color={color} />;
        }
        return <MemoPolyline key={i} positions={route.coordinates} color={color} />;
      })}
  </>
);

function Mapi({ className, center, start }: MapProps) {
  const [myStart, setMyStart] = useState(start);
  const [realStart, setRealStart] = useState(null);
  const [realArrival, setRealArrival] = useState(null);
  const [myArrival, setMyArrival] = useState(start);
  const [tripStarts, setTripStarts] = useState([]);
  const [tripEnds, setTripEnds] = useState([]);
  const [tripStart, setTripStart] = useState();
  const [tripEnd, setTripEnd] = useState();
  const [destinations, setDestinations] = useState<RallyingPoint[]>([]);
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [searchedTrips, setSearchedTrips] = useState<Trip[]>([]);
  const [steps, setSteps] = useState<RallyingPoint[]>([]);
  const [tripDay, setTripDay] = useState<DayOfWeek>();
  const [endHours, setEndHours] = useState(Hours);
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(23);
  const [availableTrips, setAvailableTrips] = useState(false);

  /**
   const [tripDay, setTripDay] = useState(days.find(jour => {
    let date = new Date();
    return date.getDay() == jour.value;
  }));

   const [startHour, setStartHour] = useState(hours.find(heure => {
    let date = new Date();
    return date.getHours() == heure.value;
  }));

   const [endHour, setEndHour] = useState(hours.find(heure => {
    let date = new Date();
    return date.getHours()+1 == heure.value;
  }));* */

  function updateEndHours(e: any) {
    const newEndHours = e.value !== 23 ? Hours.filter((hour) => hour.value > e.value) : Hours;
    setEndHour(newEndHours[0].value);
    setStartHour(e);
    setEndHours(newEndHours);
  }

  function updateStartingTrip(e: any) {
    const index = destinations.findIndex((destination) => destination.id === e.value);
    setMyStart(destinations[index]);
    setRealStart(destinations[index]);
    setTripStart(e);
  }

  function updateArrivalTrip(e: any) {
    const index = destinations.findIndex((destination) => destination.id === e.value);
    setMyArrival(destinations[index]);
    setRealArrival(destinations[index]);
    setTripEnd(e);
  }

  function getTrips() {
    displayService.Search(tripDay, realStart, realArrival, startHour, endHour).then(
      (result) => {
        setSearchedTrips(result);
      }
    );
  }

  useEffect(() => {
    if (myStart != null) {
      displayService.ListDestinationsFrom(myStart.id).then(
        (result) => {
          result.push(myStart);
          setDestinations(result);
          const tripsList = [];
          result.forEach((city) => {
            tripsList.push({
              label: city.id.replaceAll("_", " "),
              value: city.id
            });
          });
          setTripStarts(tripsList);
          setTripEnds(tripsList);
        }
      );
    }
  }, [myStart]);

  useEffect(() => {
    setTripEnds(tripStarts.filter((point) => point !== tripStart));
  }, [tripStart]);

  useEffect(() => {
    displayService.GetRoutes(searchedTrips, tripDay, startHour, endHour)
      .then((result) => {
        setRoutes(result);
      });
    displayService.ListStepsFrom(searchedTrips)
      .then((result) => setSteps(result));
  }, [searchedTrips, tripDay, startHour, endHour]);

  useEffect(() => {
    if (realStart && realArrival) {
      setAvailableTrips(true);
    }
  }, [realStart, realArrival, searchedTrips]);

  return (
    <div>
      {availableTrips
      && <AvailableTrips searchedTrips={searchedTrips} />}
      <div className="container" style={{ top: 10, right: 10, width: 250, zIndex: 3, position: "absolute" }}>
        <form className="form">
          <div className="row">
            <div className="col-md-4">
              <label>Lieu de départ</label>
              <Select
                options={tripStarts}
                value={tripStart}
                onChange={updateStartingTrip}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <label>Lieu d&apos;arrivée</label>
              <Select
                options={tripEnds}
                value={tripEnd}
                onChange={updateArrivalTrip}
                placeholder="Sélectionnez un lieu"
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <label>Jour</label>
              <Select options={Days} value={tripDay} onChange={setTripDay} placeholder="Sélectionnez un jour" />
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <label>Départ entre :</label>
              <Select
                options={Hours}
                value={startHour}
                onChange={updateEndHours}
                placeholder="Sélectionnez une heure"
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <label>et :</label>
              <Select options={endHours} value={endHour} onChange={setEndHour} placeholder="Sélectionnez une heure" />
            </div>
          </div>
          <div className="p-2">
            <Button label="Rechercher" onClick={getTrips} />
          </div>
        </form>
      </div>
      <MapContainer
        className={className}
        center={center}
        zoom={12}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />
        {
          myStart
          && <MultiPolyline routes={routes} />
        }
        {
          myStart
          && (
            <div>
              {destinations.map((point, index) => {
                const iconLookup = (s) => {
                  if (s.id === point.id) {
                    return customIcon;
                  }
                  if (myArrival.id === point.id) {
                    return customIconRed;
                  }
                  return customIconGray;

                };
                return (
                  <Marker
                    key={index}
                    position={point.position}
                    icon={iconLookup(myStart)}
                    eventHandlers={{
                      click: () => {
                        const pointData = tripStarts.find((point0) => point0.value === point.id);
                        setMyStart(point);
                        setTripStart(pointData);
                      }
                    }}
                  />
                );
              })}
            </div>
          )
        }
        {
          myStart
          && (
            <div>
              {steps.map((point, index) => (
                <Marker
                  key={index}
                  position={point.position}
                  icon={customIconRed}
                  eventHandlers={{
                    click: () => {
                      const pointData = tripStarts.find((point0) => point0.value === point.id);
                      setTripStart(pointData);
                      setMyStart(point);
                    }
                  }}
                />
              ))}
            </div>
          )

        }
      </MapContainer>
    </div>
  );
}

export default Mapi;