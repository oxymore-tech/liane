import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { LatLng, RallyingPoint, RawTrip, UserLocation } from "@/api";
import { RallyingPointMarker } from "@/components/RallyingPointMarker";
import { rallyingPointService } from "@/api/rallying-point-service";
import { adminService } from "@/api/admin-service";
import { FiltersAdmin } from "@/components/FiltersAdmin";

const colors: string[] = [
  "#22278A",
  "#0B79F9",
  "#FF8484",
  "#FF5B22",
  "#FFB545"
];

interface MapProps {
  className?: string;
  center: LatLng;
}

export interface FilterOptions {
  displayRawTrips: boolean;
  displayRallyingPoints: boolean;
  allUsers : boolean ;
  chosenUser?: string ;
  displayBackground: boolean;
  displayForeground: boolean;
  distanceBetweenPoints?: number;
  timeBetweenPoints?: number;
}

function extractUsers(rawTrips: RawTrip[]) {
  let users = new Set<string>();

  rawTrips.forEach((r: RawTrip) => {
    users = users.add(r.user);
  });

  return users;
}

function distance(l1: UserLocation, l2: UserLocation) {
  const d1 = l1.latitude * (Math.PI / 180.0);
  const num1 = l1.longitude * (Math.PI / 180.0);
  const d2 = l2.latitude * (Math.PI / 180.0);
  const num2 = l2.longitude * (Math.PI / 180.0) - num1;
  const d3 = Math.sin((d2 - d1) / 2.0) ** 2.0
        + Math.cos(d1) * Math.cos(d2) * Math.sin(num2 / 2.0) ** 2.0;
  return 6376500.0 * (2.0 * Math.atan2(Math.sqrt(d3), Math.sqrt(1.0 - d3)));
}

function filterRawTrips(rawTrips: RawTrip[], options: FilterOptions): RawTrip[] {
  let tRawTrips: RawTrip[] = rawTrips;

  // Filter to the selected user
  if (!options.allUsers) {
    tRawTrips = tRawTrips.filter((rawTrip: RawTrip) => (
      rawTrip.user === options.chosenUser
    ));
  }

  // Filter foreground locations
  if (!options.displayForeground) {
    tRawTrips = tRawTrips.map((rawTrip: RawTrip) => (
      { user: rawTrip.user, locations: rawTrip.locations.filter((l: UserLocation) => (l.isForeground === undefined || l.isForeground)) }
    ));
  }

  // Filter background locations
  if (!options.displayBackground) {
    tRawTrips = tRawTrips.map((rawTrip: RawTrip) => (
      { user: rawTrip.user, locations: rawTrip.locations.filter((l: UserLocation) => (l.isForeground === undefined || !l.isForeground)) }
    ));
  }

  // Filter locations % distance
  if (options.distanceBetweenPoints && options.distanceBetweenPoints > 0) {
    let j = 0;
    tRawTrips = tRawTrips.map((rawTrip: RawTrip) => (
      {
        user: rawTrip.user,
        locations: rawTrip.locations.filter((l: UserLocation, i: number) => {
          let valid = false;
          const previous = rawTrip.locations[j];

          if (previous && distance(previous, l) >= options.distanceBetweenPoints!) {
            valid = true;
            j = i;
          }

          return valid;
        })
      }
    ));
  }

  // Filter locations % time
  if (options.timeBetweenPoints && options.timeBetweenPoints > 0) {
    let j = 0;
    tRawTrips = tRawTrips.map((rawTrip: RawTrip) => (
      {
        user: rawTrip.user,
        locations: rawTrip.locations.filter((l: UserLocation, i: number) => {
          let valid = false;
          const previous = rawTrip.locations[j];

          if (previous && l.timestamp - (options.timeBetweenPoints! * 60 * 1000) >= previous.timestamp) {
            valid = true;
            j = i;
          }

          return valid;
        })
      }
    ));
  }

  return tRawTrips;
}

function LianeMapAdmin({ className, center }: MapProps) {

  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [rawTrips, setRawTrips] = useState<RawTrip[]>([]);
  const [displayRawTrips, setDisplayRawTrips] = useState<RawTrip[]>([]);
  const [displayRallyingPoints, setDisplayRallyingPoint] = useState(false);

  // Gets data from FilterAdmin and applies it to the map
  function updateDisplayRawTrips(options : FilterOptions) {
    console.log("update");
    setDisplayRallyingPoint(options.displayRallyingPoints);
    setDisplayRawTrips(filterRawTrips(rawTrips, options));
  }

  useEffect(() => {
    adminService.getAllRawTrips()
      .then((r) => {
        console.log(r.length);
        setRawTrips(r);
      });
  }, []);

  useEffect(() => {
    rallyingPointService.list(center.lat, center.lng)
      .then((r) => {
        setRallyingPoints(r);
      });
  }, [center]);

  const tooltip = (i: number, j: number, l: UserLocation) => (
    <Tooltip>
      <p>{`Trajet n°${i} | ${j}`}</p>
      <p>
        {new Intl.DateTimeFormat(
          "fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }
        ).format(new Date(l.timestamp))}
      </p>
      <p>{`Vitesse : ${l.speed ? l.speed : "Inconnue"}`}</p>
      <p>{l.isApple ? "Apple" : "Android"}</p>
      <p>
        { `Permission : ${l.permissionLevel}` }
      </p>
      <p>
        { () => {
          if (l.isForeground === undefined) {
            return "Undefined";
          }
          return l.isForeground ? "Foreground" : "Background";
        }}
      </p>
    </Tooltip>
  );

  return (
    <div>
      <FiltersAdmin callback={updateDisplayRawTrips} users={extractUsers(rawTrips)} />
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
        {
          displayRallyingPoints
            ? (
              rallyingPoints.map((point: RallyingPoint, i: number) => (
                <RallyingPointMarker key={`rl_${i}`} value={point} onSelect={() => {}} />
              )))
            : <></>
        }
        {
          displayRawTrips.map((a: RawTrip, k: number) => (
            a.locations.map((l: UserLocation, j: number) => (
              <CircleMarker key={`l_${k}_${j}`} center={[l.latitude, l.longitude]} pathOptions={{ color: colors[k % colors.length] }} radius={10}>
                {tooltip(k, j, l)}
              </CircleMarker>
            ))))
        }
      </MapContainer>
    </div>
  );
}

export default LianeMapAdmin;
