import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  LatLng,
  RallyingPoint,
  TripFilterOptions,
  RoutedLiane, distance, LianeUsage
} from "@/api";
import { displayService } from "@/api/display-service";
import { rallyingPointService } from "@/api/rallying-point-service";
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
      const l = newLianes.sort((a: RoutedLiane, b: RoutedLiane) => b.usages.length - a.usages.length);
      setLianes(l);

      for (let i = l.length - 1; i > 0; i--) {
        if (l[i].usages.filter((u: LianeUsage) => u.isPrimary).length > 0) {
          setMaxUsages(l[i].usages.length);
          break;
        }
      }
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
          && lianes.map((l: RoutedLiane) => <LianeRoute liane={l} maxUsages={maxUsages} />) }

      </MapContainer>
    </div>
  );
}

export default LianeMap;
