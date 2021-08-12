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
  toLatLng,
  UserLocation
} from "@/api";
import { RallyingPointService } from "@/api/services/rallying-point-service";
import { AdminFilter, FilterOptions } from "@/components/AdminFilter";
import { LianeStatistics } from "@/components/LianeStatistics";
import { TripService } from "@/api/services/trip-service";
import CenterHandler from "@/components/map/CenterHandler";
import { Switch } from "@/components/base/Switch";
import { Button } from "@/components/base/Button";
import ZoomHandler from "@/components/map/ZoomHandler";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";

const ZOOM_LEVEL_TO_SHOW_RP: number = 12;

const colors: string[] = [
  "#22278A",
  "#0B79F9",
  "#FF8484",
  "#FF5B22",
  "#FFB545",
  "#22892C",
  "#892B22",
  "#552586"
];

interface MapProps {
  className?: string;
  center: LatLng;
}

enum Mode {
  RawTrips,
  Lianes,
  RallyingPoints
}

function filterRawTrips(rawTrips: IndexedRawTrip[], options: FilterOptions): IndexedRawTrip[] {
  let tRawTrips: IndexedRawTrip[] = rawTrips;

  // Filter to the selected user
  if (options.chosenUser) {
    tRawTrips = tRawTrips.filter((r: IndexedRawTrip) => (
      r.user === options.chosenUser
    ));
  }

  // Filter for the selected trip
  if (options.chosenTrip) {
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
function tooltip(index: number, i: number, j: number, user: string, l: UserLocation) {
  return (
    <Tooltip>
      <p>{`Trajet n°${index} | ${i}-${j}`}</p>
      <p>{`Utilisateur : ${user}`}</p>
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
        {l.isForeground === undefined ?? (l.isForeground ? "Foreground" : "Background")}
      </p>
    </Tooltip>
  );
}

function LianeMapAdmin({ className, center }: MapProps) {
  // Data
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [rawTrips, setRawTrips] = useState<IndexedRawTrip[]>([]);
  // const [lianes, setLianes] = useState<RoutedLiane[]>([]);
  const [currentCenter, setCurrentCenter] = useState<LatLng>(center);
  const [lastCenter, setLastCenter] = useState<LatLng>(center);

  // Displayed data
  const [displayRawTrips, setDisplayRawTrips] = useState<IndexedRawTrip[]>([]);
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);
  // const [displayLianes, setDisplayLianes] = useState(false);
  const [mode, setMode] = useState<Mode>(Mode.RawTrips);

  // Statistics
  const [rawStats, setRawStats] = useState<RawTripStats>({ numberOfTrips: 0 });
  const [lianeStats, setLianeStats] = useState<LianeStats>({ numberOfTrips: 0, numberOfUsers: 0 });

  // Fetch initial data

  useEffect(() => {
    TripService.statsLiane().then((s: LianeStats) => setLianeStats(s));
    TripService.statsRaw().then((s: RawTripStats) => setRawStats(s));
  }, []);

  // Update the map

  useEffect(() => {
    RallyingPointService.list(lastCenter.lat, lastCenter.lng)
      .then((r) => setRallyingPoints(r));

    // TripService.snapLianes({ center: lastCenter })
    //   .then((l: RoutedLiane[]) => setLianes(l));
  }, [lastCenter]);

  // Handle components interaction

  const handleCenter = (newCenter: LatLng) => {
    setCurrentCenter(newCenter);
    if (distance(lastCenter, newCenter) > 15_000) {
      setLastCenter(newCenter);
    }
  };

  const handleZoom = (zoom: number) => {
    setShowRallyingPoints(zoom >= ZOOM_LEVEL_TO_SHOW_RP);
  };

  const updateDisplayRawTrips = (options : FilterOptions) => {
    setDisplayRawTrips(filterRawTrips(rawTrips, options));
  };

  const updateRawTrips = () => {
    TripService.snapRaw({ center: currentCenter } as RawTripFilterOptions)
      .then((r: RawTrip[]) => {
        const newRawTrips = r.map((rt: RawTrip, i: number) => ({ user: rt.user, locations: rt.locations, index: i }));
        setRawTrips(newRawTrips);
        setDisplayRawTrips(filterRawTrips(newRawTrips, { displayBackground: true, displayForeground: true } as FilterOptions)); // Reset the display
      });
  };

  return (
    <div>
      <div className="absolute bottom-0 left-0 z-10 overflow-auto">
        <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-6 gap-2 m-6">
          <Switch
            label="Modification des points de ralliement"
            value={mode === Mode.RallyingPoints}
            onChange={(state: boolean) => (state ? setMode(Mode.RallyingPoints) : setMode(Mode.RawTrips))}
            color="yellow"
          />
          <Button
            color="blue"
            className="col-span-2"
            label="Re-générer les lianes"
            onClick={async () => { await TripService.generateLianes(); }}
          />
          <Button
            color="blue"
            className="col-span-2"
            label="Re-générer les points de ralliement"
            onClick={async () => { await RallyingPointService.generate(); }}
          />
        </div>
      </div>
      {mode === Mode.RallyingPoints ? null : (
        <div>
          <AdminFilter callback={updateDisplayRawTrips} load={updateRawTrips} rawTrips={rawTrips} />
          <LianeStatistics numberOfLianes={lianeStats.numberOfTrips} numberOfRaws={rawStats.numberOfTrips} numberOfUsers={lianeStats.numberOfUsers} />
        </div>
      )}
      <MapContainer
        className={className}
        center={center}
        zoom={10}
        scrollWheelZoom
        zoomControl={false}
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >
        <ZoomHandler callback={handleZoom} />
        <CenterHandler callback={handleCenter} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />
        { showRallyingPoints
          && (rallyingPoints.map((point: RallyingPoint) => (
            <RallyingPointMarker key={`rl_${point.id}`} value={point} editMode={mode === Mode.RallyingPoints} />
          )))}

        { displayRawTrips.map((r: IndexedRawTrip, k: number) => (
          r.locations.map((l: UserLocation, j: number) => (
            <CircleMarker key={`l_${k}_${j}`} center={[l.latitude, l.longitude]} pathOptions={{ color: colors[r.index % colors.length] }} radius={10}>
              {tooltip(r.index, k, j, r.user, l)}
            </CircleMarker>
          ))))}
      </MapContainer>
    </div>
  );
}

export default LianeMapAdmin;
