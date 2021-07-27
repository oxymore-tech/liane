import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  LatLng,
  RallyingPoint,
  TripFilterOptions,
  RoutedLiane, distance, LianeUsage
} from "@/api";
import { TripService } from "@/api/trip-service";
import { RallyingPointService } from "@/api/rallying-point-service";
import ZoomHandler from "@/components/map/ZoomHandler";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";
import CenterHandler from "@/components/map/CenterHandler";
import { TripFilter } from "@/components/TripFilter";
import { LianeRoute } from "@/components/map/LianeRoute";

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

function LianeMap({ className, center }: MapProps) {
  DEFAULT_FILTER.center = center;

  // Map features to display
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [lianes, setLianes] = useState<RoutedLiane[]>();
  const [maxUsages, setMaxUsages] = useState<number>(0);

  // Map display options
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);
  const [filter, setFilter] = useState<TripFilterOptions>(DEFAULT_FILTER);
  const [lastCenter, setLastCenter] = useState<LatLng>(center);
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();

  // Handle map interactions

  const handleFilter = (day: number | undefined, startHour: number | undefined, endHour: number | undefined) => {
    // Update the filter
    const newFilter = { ...filter };

    newFilter.center = lastCenter;
    newFilter.from = from;
    newFilter.to = to;
    newFilter.withHour = false;

    if (day !== undefined && startHour !== undefined && endHour !== undefined) {
      newFilter.timestampFrom = startHour;
      newFilter.timestampTo = endHour;
      newFilter.withHour = true;
    }

    setFilter(newFilter);
  };

  const handleCenter = (newCenter: LatLng) => {
    // Update the filter
    const newFilter = { ...filter };
    newFilter.center = newCenter;
    setFilter(newFilter);

    // Update if necessary
    if (distance(lastCenter, newCenter) > 15_000) {
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
    TripService.snapLianes(filter).then((newLianes: RoutedLiane[]) => {
      const l = newLianes.sort((a: RoutedLiane, b: RoutedLiane) => b.usages.length - a.usages.length);
      setLianes(l);

      if (l.length > 0) {
        setMaxUsages(l[0].usages.length);
      }
    });
  };

  const updateRallyingPoints = () => {
    RallyingPointService.list(filter.center.lat, filter.center.lng).then((newRallyingPoints: RallyingPoint[]) => {
      setRallyingPoints(newRallyingPoints);
    });
  };

  // Initialize the map

  useEffect(() => {
    updateLianes();
    updateRallyingPoints();
  }, [lastCenter, filter]);

  return (
    <div>
      <TripFilter rallyingPoints={rallyingPoints} newFrom={from} newTo={to} rpUpdate={handleRp} callback={handleFilter} />
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
          && rallyingPoints.map((point: RallyingPoint) => (
            <RallyingPointMarker
              from={from}
              to={to}
              key={`rl_${point.label}`}
              value={point}
              onSelect={(isFrom: boolean) => { handleRp(point, isFrom); }}
            />
          ))}

        { lianes
          && lianes.map((l: RoutedLiane) => (
            <LianeRoute
              key={`l_${l.from.label}${l.to.label}`}
              liane={l}
              maxUsages={maxUsages}
            />
          ))}

      </MapContainer>
    </div>
  );
}

export default LianeMap;
