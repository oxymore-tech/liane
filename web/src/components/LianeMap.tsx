import React, { memo, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import {
  LatLng,
  RallyingPoint,
  TripFilter,
  RoutedLiane
} from "@/api";
import { displayService } from "@/api/display-service";
import { rallyingPointService } from "@/api/rallying-point-service";
import ZoomHandler from "@/components/map/ZoomHandler";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";

const ZOOM_LEVEL_TO_SHOW_RP: number = 12;
const DEFAULT_FILTER: TripFilter = {
  center: { lat: 0.0, lng: 0.0 },
  from: undefined,
  to: undefined,
  timestampFrom: undefined,
  timestampTo: undefined,
  withHour: false
};

interface MapProps {
  className?: string;
  center: LatLng;
}

const MemoPolyline = memo(Polyline);

function LianeMap({ className, center }: MapProps) {
  DEFAULT_FILTER.center = center;

  // Map features to display
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [lianes, setLianes] = useState<RoutedLiane[]>();

  // Map display options
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filter, setFilter] = useState<TripFilter>(DEFAULT_FILTER);

  // Handle map interaction

  // const updateFilter = (filter: TripFilter) => {
  // };

  /*
  useEffect(() => {
    Lianes.map((l:Liane) => (routingService.basicRouteMethod({ start: l.from.position, end: l.to.position }))).then((r) => (console.log(r)));
  }, []); */

  // const updateCenter = (center: LatLng) => {
  //   filter.center = center;
  // };

  const handleZoom = (zoom: number) => {
    setShowRallyingPoints(zoom >= ZOOM_LEVEL_TO_SHOW_RP);
  };

  // Handle map updates

  const updateLianes = async () => {
    displayService.getLianes(filter).then((newLianes: RoutedLiane[]) => {
      setLianes(newLianes);
    });
  };

  const updateRallyingPoints = () => {
    rallyingPointService.list(filter.center.lat, filter.center.lng).then((newRallyingPoints: RallyingPoint[]) => {
      setRallyingPoints(newRallyingPoints);
    });
  };

  // Initialize the map
  useEffect(() => {
    (async () => {
      await updateLianes();
      await updateRallyingPoints();
    })();
  }, []);

  return (
    <div>
      {/* <TripFilter /> */}
      <MapContainer
        className={className}
        center={center}
        zoom={12}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >
        <ZoomHandler callback={handleZoom} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />

        { showRallyingPoints
          && rallyingPoints.map((point, index) => <RallyingPointMarker key={`rl_${index}`} value={point} onSelect={(b) => console.log(b)} />)}

        { lianes
          && lianes.map((l: RoutedLiane) => <MemoPolyline positions={l.route.coordinates} weight={5} />)}

        {/* {steps.map((point, index) => <RallyingPointMarker key={`s_${index}`} value={point} from={from} to={to} onSelect={(b) => selectMarker(point, b)} />)} */}

      </MapContainer>
    </div>
  );
}

export default LianeMap;
