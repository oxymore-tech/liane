import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  LatLng,
  RallyingPoint,
  TripFilterOptions,
  RoutedLiane, distance
} from "@/api";
import { TripService } from "@/api/services/trip-service";
import { RallyingPointService } from "@/api/services/rallying-point-service";
import ZoomHandler from "@/components/map/ZoomHandler";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";
import CenterHandler from "@/components/map/CenterHandler";
import { TripFilter } from "@/components/TripFilter";
import { LianeRoute } from "@/components/map/LianeRoute";

const ZOOM_LEVEL_TO_SHOW_RP: number = 12;

interface MapProps {
  className?: string;
  center: LatLng;
}

function LianeMap({ className, center }: MapProps) {
  // Map features to display
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [lianes, setLianes] = useState<RoutedLiane[]>();
  const [maxUsages, setMaxUsages] = useState<number>(0);

  // Map display options
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);
  const [filter, setFilter] = useState<TripFilterOptions>({ center } as TripFilterOptions);
  const [lastCenter, setLastCenter] = useState<LatLng>(center);
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();

  // Handle map interactions

  const handleFilter = (dayFrom?: number, dayTo?: number, hourFrom?: number, hourTo?: number) => {
    // Update the filter
    const newFilter = { ...filter };

    newFilter.center = lastCenter;
    newFilter.from = from;
    newFilter.to = to;
    newFilter.dayFrom = dayFrom;
    newFilter.dayTo = dayTo;
    newFilter.hourFrom = hourFrom;
    newFilter.hourTo = hourTo;

    console.log(newFilter);

    setFilter(newFilter);
    setLastCenter(lastCenter); // Update loaded lianes and rallying points
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
      const l = newLianes.sort((a: RoutedLiane, b: RoutedLiane) => b.numberOfUsages - a.numberOfUsages);

      if (l.length > 0) {
        setMaxUsages(l[0].numberOfUsages);
      }

      setLianes(l);
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
  }, [lastCenter]);

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
              key={`rl_${point.id}`}
              value={point}
              onSelect={(isFrom: boolean) => { handleRp(point, isFrom); }}
            />
          ))}

        { lianes
          && lianes.map((l: RoutedLiane) => (
            l.isPrimary
              ? (
                <LianeRoute
                  key={`l_${l.from.label}${l.to.label}`}
                  liane={l}
                  maxUsages={maxUsages}
                />
              )
              : <></>
          ))}

      </MapContainer>
    </div>
  );
}

export default LianeMap;
