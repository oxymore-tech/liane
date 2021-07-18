import React, { memo, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import {
  LatLng,
  RallyingPoint,
  TripFilterOptions,
  RoutedLiane, distance, Liane, LianeUsage
} from "@/api";
import { displayService } from "@/api/display-service";
import { rallyingPointService } from "@/api/rallying-point-service";
import ZoomHandler from "@/components/map/ZoomHandler";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";
import CenterHandler from "@/components/map/CenterHandler";
import { TripFilter } from "@/components/TripFilter";

const ZOOM_LEVEL_TO_SHOW_RP: number = 12;

const DEFAULT_FILTER: TripFilterOptions = {
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

function isPrimary(liane: RoutedLiane): boolean {
  return liane.usages.filter((u: LianeUsage) => u.isPrimary).length > 0;
}

function getWeight(liane: RoutedLiane): number {
  return Math.min(Math.max(liane.usages.length, 2), 8);
}

function getColor(liane: RoutedLiane): string {
  let color: string;
  switch (liane.usages.length) {
    case 0:
    case 1:
    case 2:
      color = "#F1916F";
      break;
    case 3:
      color = "#ED764C";
      break;
    case 4:
      color = "#EA6031";
      break;
    case 5:
      color = "#E74D17";
      break;
    case 6:
      color = "#D84815";
      break;
    case 7:
      color = "#C14013";
      break;
    default:
      color = "#B33B12";
  }
  return color;
}

function displayLiane(liane: RoutedLiane): JSX.Element {
  if (isPrimary(liane)) {
    return (
      <MemoPolyline smoothFactor={2.0} positions={liane.route.coordinates} color={getColor(liane)} weight={getWeight(liane)}>
        <Popup closeButton={false}>
          Fréquence:
          {" "}
          {liane.usages.length}
        </Popup>
      </MemoPolyline>
    );
  }

  return (<></>);
}

function LianeMap({ className, center }: MapProps) {
  DEFAULT_FILTER.center = center;

  // Map features to display
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [lianes, setLianes] = useState<RoutedLiane[]>();

  // Map display options
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);
  const [filter, setFilter] = useState<TripFilterOptions>(DEFAULT_FILTER);
  const [lastCenter, setLastCenter] = useState<LatLng>(center);
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();

  // Handle map interactions

  const handleFilter = (filter: TripFilterOptions) => {
  };

  const handleCenter = (newCenter: LatLng) => {
    // Update the filter
    const newFilter = { ...filter };
    newFilter.center = newCenter;
    setFilter(newFilter);

    // Update if necessary
    if (distance(lastCenter, newCenter) > 25_000) {
      setLastCenter(newCenter);
    }
  };

  const handleZoom = (zoom: number) => {
    setShowRallyingPoints(zoom >= ZOOM_LEVEL_TO_SHOW_RP);
  };

  const handleRp = (rp: RallyingPoint, isFrom: boolean) => {
    if (isFrom) {
      setFrom(rp);
    } else {
      setTo(rp);
    }
  };

  // Handle map updates

  const updateLianes = () => {
    displayService.getLianes(filter).then((newLianes: RoutedLiane[]) => {
      setLianes(newLianes.sort((a: RoutedLiane, b: RoutedLiane) => b.usages.length - a.usages.length));
    });
  };

  const updateRallyingPoints = () => {
    rallyingPointService.list(filter.center.lat, filter.center.lng).then((newRallyingPoints: RallyingPoint[]) => {
      setRallyingPoints(newRallyingPoints);
    });
  };

  // Initialize the map

  useEffect(() => {
    updateLianes();
    updateRallyingPoints();
  }, [lastCenter]);

  return (
    <div>
      <TripFilter center={center} from={from} to={to} rpUpdate={handleRp} callback={handleFilter} />
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
        <CenterHandler callback={handleCenter} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />

        { showRallyingPoints
          && rallyingPoints.map((point: RallyingPoint, index: number) => <RallyingPointMarker key={`rl_${index}`} value={point} onSelect={(isFrom: boolean) => { handleRp(point, isFrom); }} />)}

        { lianes
          && lianes.map((l: RoutedLiane) => displayLiane(l))}

      </MapContainer>
    </div>
  );
}

export default LianeMap;
