"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Layer,
  Map as MapGL,
  type MapRef,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RallyingPoint } from "@/api/types";
import { boundsOf, DEFAULT_VIEW, MAP_FONT, mapStyle } from "./map-style";
import { PlaceNamesLayer } from "./place-names-layer";

const POINTS_LAYER_ID = "points-map-circle";

/** Carte des points trouvés, cadrée sur eux. Les points désactivés sont gris. */
export default function PointsMap({
  points,
  onSelect,
}: {
  points: RallyingPoint[];
  onSelect: (id: string) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const style = useMemo(mapStyle, []);

  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((point) => ({
        type: "Feature" as const,
        properties: {
          id: point.id,
          label: point.label,
          is_active: point.is_active,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [point.lng, point.lat],
        },
      })),
    }),
    [points],
  );

  useEffect(() => {
    const bounds = boundsOf(points);
    if (!loaded || !bounds) return;
    mapRef.current?.fitBounds(bounds, {
      padding: 48,
      maxZoom: 13,
      duration: 0,
    });
  }, [loaded, points]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={DEFAULT_VIEW}
      mapStyle={style}
      attributionControl={false}
      interactiveLayerIds={[POINTS_LAYER_ID]}
      onClick={(event) => {
        const id = event.features?.[0]?.properties?.id;
        if (id) onSelect(id);
      }}
      onLoad={() => setLoaded(true)}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <PlaceNamesLayer />
      <Source id="points-map" type="geojson" data={data}>
        <Layer
          id={POINTS_LAYER_ID}
          type="circle"
          paint={{
            "circle-radius": 8,
            "circle-color": [
              "case",
              ["get", "is_active"],
              "#065f46",
              "#9ca3af",
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          }}
        />
        <Layer
          id="points-map-label"
          type="symbol"
          layout={{
            "text-field": ["get", "label"],
            "text-font": MAP_FONT,
            "text-size": 11,
            "text-offset": [0, 1],
            "text-anchor": "top",
            "text-max-width": 8,
          }}
          paint={{
            "text-color": "#1f2937",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          }}
        />
      </Source>
    </MapGL>
  );
}
