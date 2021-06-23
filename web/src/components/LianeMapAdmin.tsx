import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import {
  FilterOptions, LatLng, RallyingPoint, RawTrip, UserLocation
} from "@/api";
import { RallyingPointMarker } from "@/components/RallyingPointMarker";
import { rallyingPointService } from "@/api/rallying-point-service";
import { adminService } from "@/api/admin-service";
import { FiltersAdmin } from "@/components/FiltersAdmin";

const Test = require("@/api/tests.json");

interface MapProps {
  className?: string;
  center: LatLng;
}

function LianeMapAdmin({ className, center }: MapProps) {

  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [rawTrips, setRawTrips] = useState<RawTrip[]>(Test.map((rawTrip) => (rawTrip)));
  const [displayRawTrips, setDisplayRawTrips] = useState<RawTrip[]>([]);
  const [displayRallyingPoints, setDisplayRallyingPoint] = useState(false);

  // const [displayBackground, setDisplayBackground] = useState(true);
  const [displayForeground, setDisplayForeground] = useState(true);
  const [chosenUser, setChosenUser] = useState<string>();
  const [allUsers, setAllUsers] = useState<boolean>(false);
  // const [distanceBetweenPoints, setDistanceBetweenPoints] = useState<number>();
  // const [timeBetweenPoints, setTimeBetweenPoints] = useState<number>();

  // Gets data from FilterAdmin and applies it to the map
  function updateDisplayRawTrips(filterOptions : FilterOptions) {
    // setDisplayBackground(filterOptions.displayBackground);
    // setDistanceBetweenPoints(filterOptions.distanceBetweenPoints);
    setAllUsers(filterOptions.allUsers);
    setChosenUser(filterOptions.chosenUser);
    setDisplayForeground(filterOptions.displayForeground);
    // setTimeBetweenPoints(filterOptions.timeBetweenPoints);
    setDisplayRallyingPoint(filterOptions.displayRallyingPoints);

    // Filtre utilisateurs
    console.log("raw trips", rawTrips);
    // Un utilisateur est choisi donc on récupère ses trajets persos
    // On filtre selon l'utilisateur choisi
    if (!filterOptions.allUsers) {
      setDisplayRawTrips(rawTrips.filter((rawTrip) => (
        rawTrip.user === filterOptions.chosenUser
      )));
    } else {
      setDisplayRawTrips(rawTrips);
    }
    /* if (displayForeground) {
      setDisplayRawTrips(rawTrips.map((rawTrip : RawTrip) => (
        rawTrip.locations.filter((l) => {
          return l.foreground;
        }))));
    } */
  }

  /* useEffect(() => {
    adminService.getAllRawTrips()
      .then((r) => {
        setRawTrips(r);
      });
  }, []); */

  useEffect(() => {
    rallyingPointService.list(center.lat, center.lng)
      .then((r) => {
        setRallyingPoints(r);
      });
  }, [center]);

  const displayToolTip = (l) => (
    <Tooltip>
      <p>
        {new Intl.DateTimeFormat(
          "fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }
        ).format(new Date(l.timestamp))}
      </p>
      <p>{`speed${l.speed}`}</p>
      <p>{l.isApple ? "Apple" : "android"}</p>
      <p>
        {l.permissionLevel }
      </p>
      <p>{l.foreground ? "Foreground" : "Background"}</p>
    </Tooltip>
  );

  return (
    <div>
      <FiltersAdmin callback={updateDisplayRawTrips} />
      <MapContainer
        className={className}
        center={center}
        zoom={10}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />
        {displayRallyingPoints
          ? (
            rallyingPoints.map((point, index) => (
              <RallyingPointMarker
                key={`rl_${index}`}
                value={point}
                onSelect={() => {}}
              />
            )))
          : null}
        {displayRawTrips.map((a:RawTrip) => (
          a.locations.map((l:UserLocation, j:number) => (
            <CircleMarker key={`l_${j}`} center={[l.latitude, l.longitude]} pathOptions={{ color: "red" }} radius={10}>
              {displayToolTip(l)}
            </CircleMarker>
          ))))}
      </MapContainer>
    </div>
  );
}

export default LianeMapAdmin;