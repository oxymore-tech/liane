import React, { memo, useCallback, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents
} from "react-leaflet";
import { addHours } from "date-fns";
import {
  DayOfWeek, LatLng, RallyingPoint, Route, RouteStat, Trip, UserLocation, Liane, LianeUsage, RoutingQuery
} from "@/api";
import { displayService } from "@/api/display-service";
import { rallyingPointService } from "@/api/rallying-point-service";
import { Days, Hours } from "@/api/time";
import { Button } from "@/components/base/Button";
import { Select } from "@/components/base/Select";
import { AvailableTrips } from "@/components/available_trips";
import { RallyingPointMarker } from "@/components/RallyingPointMarker";
import { routingService } from "@/api/routing-service";
import { LoginLogout } from "@/components/LoginLogout";
import { latLng, map } from "leaflet";
import FilterLianeMap from "@/components/FilterLianeMap";

const Augustin = require("@/api/augustin.json");
const Lianes = require("@/api/testLianes.json");

const ZOOM_LEVEL_TO_SHOW_RP = 12;

interface MapProps {
  className?: string;
  center: LatLng;
}

const MemoPolyline = memo(Polyline);

// const MultiPolyline = ({ routes }: { routes:RouteStat[] }) => (
//   <>
//     {routes
//       .map((route, i) => {
//         const w = route.stat;
//         const color = `#${(Math.floor((1 - route.stat / 7) * 255)).toString(16)}${(Math.floor((route.stat / 7) * 255)).toString(16)}00`;
//         if (w >= 6) {
//           return <MemoPolyline key={i} positions={route.coordinates} weight={10} color={color} />;
//         }
//         if (w > 1 && w < 6) {
//           return <MemoPolyline key={i} positions={route.coordinates} weight={5} color={color} />;
//         }
//         if (w === 1) {
//           return <MemoPolyline key={i} positions={route.coordinates} weight={2} color={color} />;
//         }
//         return <MemoPolyline key={i} positions={route.coordinates} color={color} />;
//       })}
//   </>
// );

function ZoomHandler({ callback }) {
  const map = useMapEvents({
    zoomstart(o) {
      callback(o.target._zoom);
    }
  });

  return null;
}

function LianeMap({ className, center }: MapProps) {
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [searchedTrips, setSearchedTrips] = useState<Trip[]>([]);
  const [steps, setSteps] = useState<RallyingPoint[]>([]);
  const [availableTrips, setAvailableTrips] = useState(false);
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);

  const nextHour = addHours(new Date(), 1);

  const [lastFromVsTo, setLastFromVsTo] = useState(true);
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();
  const [day, setDay] = useState<DayOfWeek>(nextHour.getDay());
  const [startHour, setStartHour] = useState(nextHour.getHours());
  const [endHour, setEndHour] = useState(nextHour.getHours() + 1);

  const [route, setRoute] = useState<Route>();

  useEffect(() => {
    rallyingPointService.list(center.lat, center.lng)
      .then((r) => {
        const first = r[0];
        if (first) {
          setFrom(first);
        }
        setRallyingPoints(r);
      });
  }, [center]);

  /*
  useEffect(() => {
    routingService.route(Augustin)
      .then((r) => setRoute(r));
  }, []); */

  /*
  useEffect(() => {
     Lianes.map((l:Liane) => (routingService.basicRouteMethod({ start: l.from.position, end: l.to.position }))).then((r) => (console.log(r)));
  }, []);

   */

  const selectMarker = (point:RallyingPoint, fromVsTo: boolean) => {
    setLastFromVsTo(fromVsTo);
    if (fromVsTo) {
      setFrom(point);
    } else {
      setTo(point);
    }
  };

  useEffect(() => {
    if (from === to) {
      if (lastFromVsTo) {
        setTo(undefined);
      } else {
        setFrom(undefined);
      }
    }
  }, [lastFromVsTo, from, to]);

  const getTrips = useCallback(async () => {
    const trips = await displayService.search(day, from, to, startHour, endHour);
    setSearchedTrips(trips);
  }, [day, from, to, startHour, endHour]);

  useEffect(() => {
    if (from) {
      rallyingPointService.list(center.lat, center.lng)
        .then((r) => {
          const rallyingPoint = r[0];
          if (rallyingPoint) {
            setFrom(rallyingPoint);
          }
          setRallyingPoints(r);
        });
    }
  }, [center]);

  useEffect(() => {
    displayService.getStat(searchedTrips, day, startHour, endHour)
      .then((result) => {
        setRoutes(result);
      });
    displayService.listStepsFrom(searchedTrips)
      .then((result) => setSteps(result));
  }, [searchedTrips, day, startHour, endHour]);

  function zoomHandler(zoom) {
    setShowRallyingPoints(zoom >= ZOOM_LEVEL_TO_SHOW_RP);
  }

  return (
    <div>
      {availableTrips
      && <AvailableTrips searchedTrips={searchedTrips} />}
      <FilterLianeMap center={center} />
      <MapContainer
        className={className}
        center={center}
        zoom={12}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >
        <ZoomHandler callback={zoomHandler} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />
        {route && <MemoPolyline positions={route.coordinates} weight={5} />}
        {showRallyingPoints && rallyingPoints.map((point, index) => <RallyingPointMarker key={`rl_${index}`} value={point} from={from} to={to} onSelect={(b) => selectMarker(point, b)} />)}
        {steps.map((point, index) => <RallyingPointMarker key={`s_${index}`} value={point} from={from} to={to} onSelect={(b) => selectMarker(point, b)} />)}
        {Augustin.map((a:UserLocation, index:number) => (
          <CircleMarker key={`a_${index}`} center={[a.latitude, a.longitude]} pathOptions={{ color: "red" }} radius={5}>
            <Tooltip>
              <p>{new Intl.DateTimeFormat("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).format(new Date(a.timestamp))}</p>
              <p>{a.speed}</p>
            </Tooltip>
          </CircleMarker>
        ))}
        {Lianes.map((l:Liane) => (
          <>
            <CircleMarker key="From" center={l.from.position} pathOptions={{ color: "blue" }} radius={20} />
            <CircleMarker key="To" center={l.to.position} pathOptions={{ color: "green" }} radius={20} />
          </>
        ))}
      </MapContainer>
    </div>
  );
}

export default LianeMap;