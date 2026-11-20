"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Map as MapGL,
  type MapRef,
  Marker,
  NavigationControl,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_VIEW, mapColors, mapStyle } from "./map-style";
import { RallyingPointsLayer } from "./rallying-points-layer";

type Place = { lat: number; lng: number };

const CLOSE_ZOOM = 14;

/** Carte où l'on place un point : toucher la carte ou déplacer le repère. `center` recentre la carte. */
export default function PointPicker({
  position,
  center,
  onChange,
}: {
  position: Place | null;
  center?: Place | null;
  onChange: (position: Place) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const style = useMemo(mapStyle, []);

  useEffect(() => {
    if (!center) return;
    mapRef.current?.jumpTo({
      center: [center.lng, center.lat],
      zoom: CLOSE_ZOOM,
    });
  }, [center]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={
        position
          ? {
              longitude: position.lng,
              latitude: position.lat,
              zoom: CLOSE_ZOOM,
            }
          : DEFAULT_VIEW
      }
      mapStyle={style}
      attributionControl={false}
      cursor="crosshair"
      onClick={(event) => onChange(event.lngLat)}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <RallyingPointsLayer />
      {position && (
        <Marker
          longitude={position.lng}
          latitude={position.lat}
          anchor="bottom"
          color={mapColors().liane}
          draggable
          onDragEnd={(event) => onChange(event.lngLat)}
        />
      )}
    </MapGL>
  );
}
