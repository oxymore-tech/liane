import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import {
  distance,
  IndexedRawTrip,
  LatLng,
  LianeStats,
  RallyingPoint,
  RawTrip,
  RawTripFilterOptions,
  RawTripStats,
  RoutedLiane, toLatLng,
  UserLocation
} from "@/api";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";
import { RallyingPointService } from "@/api/rallying-point-service";
import { AdminFilter } from "@/components/AdminFilter";
import { LianeStatistics } from "@/components/LianeStatistics";
import { TripService } from "@/api/trip-service";
// import { useHistory } from "react-router-dom";
import CenterHandler from "@/components/map/CenterHandler";

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
  allUsers: boolean;
  chosenUser?: string;
  allTrips: boolean;
  chosenTrip?: number;
  displayBackground: boolean;
  displayForeground: boolean;
  distanceBetweenPoints?: number;
  timeBetweenPoints?: number;
}

function filterRawTrips(rawTrips: IndexedRawTrip[], options: FilterOptions): IndexedRawTrip[] {
  let tRawTrips: IndexedRawTrip[] = rawTrips;

  // Filter to the selected user
  if (!options.allUsers) {
    tRawTrips = tRawTrips.filter((r: IndexedRawTrip) => (
      r.user === options.chosenUser
    ));
  }

  // Filter for the selected trip
  if (!options.allTrips) {
    tRawTrips = tRawTrips.filter((r: IndexedRawTrip) => (
      r.index === options.chosenTrip
    ));
  }

  // Filter foreground locations
  if (!options.displayForeground) {
    tRawTrips = tRawTrips.map((r: IndexedRawTrip) => (
      { index: r.index, user: r.user, locations: r.locations.filter((l: UserLocation) => (l.isForeground === undefined || l.isForeground)) }
    ));
  }

  // Filter background locations
  if (!options.displayBackground) {
    tRawTrips = tRawTrips.map((r: IndexedRawTrip) => (
      { index: r.index, user: r.user, locations: r.locations.filter((l: UserLocation) => (l.isForeground === undefined || !l.isForeground)) }
    ));
  }

  // Filter locations % distance
  const d = options.distanceBetweenPoints;
  if (d && d > 0) {
    let j = 0;
    tRawTrips = tRawTrips.map((r: IndexedRawTrip) => (
      {
        index: r.index,
        user: r.user,
        locations: r.locations.filter((l: UserLocation, i: number) => {
          let valid = false;
          const previous = r.locations[j];

          if (previous && distance(toLatLng(previous), toLatLng(l)) >= d) {
            valid = true;
            j = i;
          }

          return valid;
        })
      }
    ));
  }

  // Filter locations % time
  const t = options.timeBetweenPoints;
  if (t && t > 0) {
    let j = 0;
    tRawTrips = tRawTrips.map((r: IndexedRawTrip) => (
      {
        index: r.index,
        user: r.user,
        locations: r.locations.filter((l: UserLocation, i: number) => {
          let valid = false;
          const previous = r.locations[j];

          if (previous && l.timestamp - (t * 60 * 1000) >= previous.timestamp) {
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

// Create a tooltip view
function tooltip(index:number, i: number, j: number, l: UserLocation) {
  return (
    <Tooltip>
      <p>{`Trajet n°${index} | ${i}-${j}`}</p>
      <p>
        {new Intl.DateTimeFormat(
          "fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric"
          }
        ).format(new Date(l.timestamp))}
      </p>
      <p>{`Vitesse : ${l.speed ? l.speed : "Inconnue"}`}</p>
      <p>{`Précision : ${l.accuracy ? l.accuracy : "Inconnue"}`}</p>
      <p>{l.isApple ? "Apple" : "Android"}</p>
      <p>
        {`Permission : ${l.permissionLevel}`}
      </p>
      <p>
        {() => {
          if (l.isForeground === undefined) {
            return "Undefined";
          }
          return l.isForeground ? "Foreground" : "Background";
        }}
      </p>
    </Tooltip>
  );
}

function LianeMapAdmin({ className, center }: MapProps) {
  // Data
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [rawTrips, setRawTrips] = useState<IndexedRawTrip[]>([]);
  const [lianes, setLianes] = useState<RoutedLiane[]>([]);
  const [lastCenter, setLastCenter] = useState<LatLng>(center);

  // Displayed data
  const [displayRawTrips, setDisplayRawTrips] = useState<IndexedRawTrip[]>([]);
  const [displayRallyingPoints, setDisplayRallyingPoint] = useState(false);
  const [displayLianes, setDisplayLianes] = useState(false);

  // Statistics
  const [rawStats, setRawStats] = useState<RawTripStats>({ numberOfTrips: 0 });
  const [lianeStats, setLianeStats] = useState<LianeStats>({ numberOfTrips: 0, numberOfUsers: 0 });

  // Fetch initial data

  useEffect(() => {
    try {
      TripService.statsLiane().then((s: LianeStats) => setLianeStats(s));
      TripService.statsRaw().then((s: RawTripStats) => setRawStats(s));
    } catch (e) {
      // const history = useHistory();
      // history.push("/auth-error");
    }
  }, []);

  // Update the map

  useEffect(() => {
    try {
      RallyingPointService.list(lastCenter.lat, lastCenter.lng)
        .then((r) => setRallyingPoints(r));

      TripService.snapRaw({ center: lastCenter } as RawTripFilterOptions)
        .then((r: RawTrip[]) => {
          if (r.length > 0) setRawTrips(r.map((rt: RawTrip, i: number) => ({ user: rt.user, locations: rt.locations, index: i })));
        });

      // TripService.snapLianes({ center: lastCenter })
      //   .then((l: RoutedLiane[]) => setLianes(l));
    } catch (e) {
      // const history = useHistory();
      // history.push("/auth-error");
    }
  }, [lastCenter]);

  // Handle components interaction

  const handleCenter = (newCenter: LatLng) => {
    if (distance(lastCenter, newCenter) > 15_000) {
      setLastCenter(newCenter);
    }
  };

  const updateDisplayRawTrips = (options : FilterOptions) => {
    setDisplayRallyingPoint(options.displayRallyingPoints);
    setDisplayRawTrips(filterRawTrips(rawTrips, options));
  };

  return (
    <div>
      <AdminFilter callback={updateDisplayRawTrips} rawTrips={rawTrips} />
      <LianeStatistics numberOfLianes={lianeStats.numberOfTrips} numberOfRaws={rawStats.numberOfTrips} numberOfUsers={lianeStats.numberOfUsers} />
      <MapContainer
        className={className}
        center={center}
        zoom={10}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >
        <CenterHandler callback={handleCenter} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />
        {
          displayRallyingPoints
          && (rallyingPoints.map((point: RallyingPoint, i: number) => (
            <RallyingPointMarker key={`rl_${i}`} value={point} onSelect={() => {}} />
          )))
        }
        {
          displayRawTrips.map((r: IndexedRawTrip, k: number) => (
            r.locations.map((l: UserLocation, j: number) => (
              <CircleMarker key={`l_${k}_${j}`} center={[l.latitude, l.longitude]} pathOptions={{ color: colors[r.index % colors.length] }} radius={10}>
                {tooltip(r.index, k, j, l)}
              </CircleMarker>
            ))
          ))
        }
      </MapContainer>
    </div>
  );
}

export default LianeMapAdmin;
