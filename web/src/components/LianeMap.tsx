import React, { memo, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import {
  LatLng,
  RallyingPoint,
  TripFilter,
  RoutedLiane, distance
} from "@/api";
import { displayService } from "@/api/display-service";
import { rallyingPointService } from "@/api/rallying-point-service";
import ZoomHandler from "@/components/map/ZoomHandler";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";
import CenterHandler from "@/components/map/CenterHandler";
import { FilterLianeMap } from "@/components/FilterLianeMap";

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

export interface FilterOptions {
  from?: RallyingPoint;
  to?: RallyingPoint;
}

const MemoPolyline = memo(Polyline);

function LianeMap({ className, center }: MapProps) {
  DEFAULT_FILTER.center = center;

  // Map features to display
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [lianes, setLianes] = useState<RoutedLiane[]>();

  // Map display options
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);
  const [filter, setFilter] = useState<TripFilter>(DEFAULT_FILTER);
  const [lastCenter, setLastCenter] = useState<LatLng>(center);
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();

  // Handle map interaction
  function updateFromTo(options : FilterOptions) {
    console.log("update from");
    setFrom(options.from);
    console.log(from, options.from);
    setTo(options.to);
  }

  // const updateFilter = (filter: TripFilter) => {
  // };

  const handleCenter = (newCenter: LatLng) => {
    // Update the filter
    const newFilter = { ...filter };
    newFilter.center = newCenter;
    setFilter(newFilter);

    // Update if necessary
    if (distance(lastCenter, newCenter) > 25000) {
      setLastCenter(newCenter);
    }
  };

  const handleZoom = (zoom: number) => {
    setShowRallyingPoints(zoom >= ZOOM_LEVEL_TO_SHOW_RP);
  };

  // Handle map updates

  const updateLianes = () => {
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
    updateLianes();
    updateRallyingPoints();
  }, [lastCenter]);

  return (
    <div>
      {/* availableTrips
      && <AvailableTrips searchedTrips={searchedTrips} /> */}
      <FilterLianeMap center={center} callback={updateFromTo} />
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
          && rallyingPoints.map((point, index) => <RallyingPointMarker key={`rl_${index}`} value={point} onSelect={(b) => console.log(b)} />)}

        { lianes
          && lianes.map((l: RoutedLiane) => <MemoPolyline positions={l.route.coordinates} weight={5} />)}

      </MapContainer>
    </div>
  );
}

export default LianeMap;
