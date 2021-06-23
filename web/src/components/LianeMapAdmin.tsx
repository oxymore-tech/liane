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

  // Gets data from FilterAdmin and applies it to the map
  function updateDisplayRawTrips(filterOptions : FilterOptions) {
    setDisplayRallyingPoint(filterOptions.displayRallyingPoints);
    let tempRawTrip : RawTrip[] = rawTrips;

    // Filtre utilisateurs
    console.log("raw trips", rawTrips);
    // Un utilisateur est choisi donc on récupère ses trajets persos
    // On filtre selon l'utilisateur choisi
    if (!filterOptions.allUsers) {
      tempRawTrip = tempRawTrip.filter((rawTrip) => (
        rawTrip.user === filterOptions.chosenUser
      ));
    }

    // pas de foreground => on veut la donnée pas à true
    // pas de background => on veut la donnée pas à false
    // ni l'un ni l'autre on veut ni true ni false

    if (filterOptions.displayForeground) {
      tempRawTrip = tempRawTrip.map((rawTrip : RawTrip) => (
        { user: rawTrip.user, locations: rawTrip.locations.filter((l) => (l.foreground)) }
      ));
    }
    if (filterOptions.distanceBetweenPoints) {
      tempRawTrip = tempRawTrip.map((rawTrip : RawTrip) => (
        { user: rawTrip.user,
          locations: rawTrip.locations.filter((l, index) => {
            // filterOptions.distanceBetweenPoints already checked
            if (index === 0 || Distance(rawTrip.locations[index + 1], l) <= filterOptions.distanceBetweenPoints) {
              return l;
            }

            return l;

          }) }
      ));
    }

    setDisplayRawTrips(tempRawTrip);
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

  function Distance(location1: UserLocation, location2: UserLocation) {
    const d1 = location1.latitude * (Math.PI / 180.0);
    const num1 = location1.longitude * (Math.PI / 180.0);
    const d2 = location2.latitude * (Math.PI / 180.0);
    const num2 = location2.longitude * (Math.PI / 180.0) - num1;
    const d3 = Math.pow(Math.sin((d2 - d1) / 2.0), 2.0)
        + Math.cos(d1) * Math.cos(d2) * Math.pow(Math.sin(num2 / 2.0), 2.0);
    return 6376500.0 * (2.0 * Math.atan2(Math.sqrt(d3), Math.sqrt(1.0 - d3)));
  }

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