"use client";

import { useCallback, useRef, useState } from "react";
import {
  GeolocateControl,
  Map as MapGL,
  type MapLayerMouseEvent,
  type MapRef,
  NavigationControl,
  Popup,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { RallyingPointsLayer } from "./rallying-points-layer";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

const DEFAULT_CENTER = { longitude: 1.44, latitude: 43.6 };
const DEFAULT_ZOOM = 12;

type PointPopup = {
  lng: number;
  lat: number;
  label: string;
  city: string;
  kind: string;
};

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PointPopup | null>(null);

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;
    const [lng, lat] = feature.geometry.coordinates;
    const { label, city, kind } = feature.properties;
    setPopup({ lng, lat, label, city: city ?? "", kind: kind ?? "" });
  }, []);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{
        ...DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      }}
      mapStyle={MAP_STYLE}
      attributionControl={false}
      interactiveLayerIds={["rallying-points-circle"]}
      onClick={onClick}
      cursor="auto"
    >
      <GeolocateControl
        positionOptions={{ enableHighAccuracy: true }}
        trackUserLocation
      />
      <NavigationControl position="top-right" />
      <RallyingPointsLayer />

      {popup && (
        <Popup
          longitude={popup.lng}
          latitude={popup.lat}
          offset={8}
          closeOnClick={false}
          onClose={() => setPopup(null)}
        >
          <strong>{popup.label}</strong>
          <br />
          {popup.city}
          <br />
          <em>{popup.kind}</em>
        </Popup>
      )}
    </MapGL>
  );
}
