import React, { memo, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapContainer, Marker, Popup, TileLayer, Polyline
} from "react-leaflet";
import { icon } from "leaflet";
import Select from "react-select";
import { RallyingPoint, LatLng, Trip, RouteStat } from "../api";
import { displayService } from "../api/display-service";
import { days, hours } from "../../assets/time.data";
import { Button } from "./base/Button";
import { AvailableTrips } from "./available_trips";
import { TextInput } from "./base/TextInput";

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

let counter = 0;

const MultiPolyline = ({ routes }) => (routes.map((route : RouteStat, index : number) => {
  counter += 1;
  const w = route.stat;
  console.log("Coucou on est rentré");
  const color = `#${(Math.floor((1 - route.stat / 5) * 255)).toString(16)}${(Math.floor((route.stat / 5) * 255)).toString(16)}00`;
  console.log(color);
  if (w > 1) {

    return <MemoPolyline key={counter} positions={route.coordinates} weight={5} color={color} />;
  }
  if (w == 1) {
    return <MemoPolyline key={counter} positions={route.coordinates} weight={2} color={color} />;
  }
})
);

function MapUser({ className, center, start }: MapProps) {
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [user, setUser] = useState("");
  const [destinations, setDestinations] = useState<RallyingPoint[]>([]);
  const [tripDay, setTripDay] = useState(days.find((jour) => {
    const date = new Date();
    return date.getDay() == jour.value;
  }));

  function getTrips() {
    displayService.ListTripsUser(user, tripDay.value.toString()).then(
      (result) => {
        console.log("RESULT : ", result);
        setDestinations(result);
      }
    );
  }

  return (
    <div>
      <div className="container" style={{ top: 10, right: 10, width: 250, zIndex: 3, position: "absolute" }}>
        <form className="form">
          <div className="row">
            <div className="col-md-4">
              <label>Nom de l'utilisateur</label>
              <TextInput type="text" value={user} onChange={setUser} placeholder="Nom d'un utilisateur" />
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <label>Jour</label>
              <Select options={days.concat({ label: "Tous", value: -1 })} value={tripDay} onChange={setTripDay} placeholder="Sélectionnez un jour" />
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
        <div>
          <MultiPolyline routes={routes} />
        </div>
        <div>
          {destinations.map((point, index) => (
            <Marker key={index} position={point.position} icon={customIcon} />
          ))}
        </div>
      </MapContainer>
    </div>
  );
}

export default MapUser;