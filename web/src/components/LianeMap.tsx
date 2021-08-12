import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import {
  LatLng,
  RallyingPoint,
  TripFilterOptions,
  RoutedLiane,
  distance, compareRallyingPoints
} from "@/api";
import { TripService } from "@/api/services/trip-service";
import { RallyingPointService } from "@/api/services/rallying-point-service";
import ZoomHandler from "@/components/map/ZoomHandler";
import { RallyingPointMarker } from "@/components/map/RallyingPointMarker";
import CenterHandler from "@/components/map/CenterHandler";
import { TripFilter } from "@/components/TripFilter";
import { LianeRoute } from "@/components/map/LianeRoute";

const ZOOM_LEVEL_TO_SHOW_RP: number = 12;
const SELECTED_COLOR = "#22278A";
const SELECTED_WEIGHT = 6;

interface MapProps {
  className?: string;
  center: LatLng;
}

function LianeMap({ className, center }: MapProps) {
  // Map features to display
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [lianes, setLianes] = useState<RoutedLiane[]>();
  const [maxUsages, setMaxUsages] = useState(0);
  const [numberLoading, setNumberLoading] = useState(0);
  const [selectedLiane, setSelectedLiane] = useState<RoutedLiane>();

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
    const newCenter = { lat: lastCenter.lat, lng: lastCenter.lng + 0.000001 } as LatLng; // Needs to be slightly different

    newFilter.center = newCenter;
    newFilter.from = from;
    newFilter.to = to;
    newFilter.dayFrom = dayFrom;
    newFilter.dayTo = dayTo;
    newFilter.hourFrom = hourFrom;
    newFilter.hourTo = hourTo;

    setFilter(newFilter);
    setLastCenter(newCenter); // Update loaded lianes and rallying points
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

  const handleSelection = (l: RoutedLiane | undefined) => {
    setSelectedLiane(l);
  };

  // Handle map updates

  const updateLianes = () => {
    setNumberLoading(numberLoading + 1);

    TripService.snapLianes(filter).then((newLianes: RoutedLiane[]) => {
      const l = newLianes.sort((a: RoutedLiane, b: RoutedLiane) => b.numberOfUsages - a.numberOfUsages);

      if (l.length > 0) {
        setMaxUsages(l[0].numberOfUsages);
      }

      setLianes(l);
      setNumberLoading(numberLoading > 0 ? numberLoading - 1 : 0);
    });
  };

  const updateRallyingPoints = () => {
    setNumberLoading(numberLoading + 1);

    RallyingPointService.list(filter.center.lat, filter.center.lng).then((newRallyingPoints: RallyingPoint[]) => {
      setRallyingPoints(newRallyingPoints.sort(compareRallyingPoints));
      setNumberLoading(numberLoading > 0 ? numberLoading - 1 : 0);
    });
  };

  // Initialize the map

  useEffect(() => {
    updateLianes();
    updateRallyingPoints();
  }, [lastCenter]);

  return (
    <div className="relative">
      <TripFilter rallyingPoints={rallyingPoints} newFrom={from} newTo={to} rpUpdate={handleRp} loading={numberLoading > 0} callback={handleFilter} />
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
                  onOpen={() => handleSelection(l)}
                  onClose={() => handleSelection(undefined)}
                />
              )
              : <></>
          ))}

        { selectedLiane
          && (
          <Polyline
            smoothFactor={2.0}
            positions={selectedLiane.route.coordinates}
            color={SELECTED_COLOR}
            weight={SELECTED_WEIGHT}
          />
          )}

      </MapContainer>
    </div>
  );
}

export default LianeMap;
