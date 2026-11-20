"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Layer,
  Map as MapGL,
  type MapLayerMouseEvent,
  type MapRef,
  Source,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ReactNode } from "react";
import {
  boundsOf,
  DEFAULT_VIEW,
  MAP_FONT,
  mapColors,
  mapStyle,
  POINT_TEXT_FIELD,
} from "./map-style";
import { PlaceNamesLayer } from "./place-names-layer";

type Stop = {
  id: string;
  lat: number;
  lng: number;
  city: string;
  label: string;
};

type Props = {
  stops: Stop[];
  route?: [number, number][] | null;
  onClick?: (event: MapLayerMouseEvent) => void;
  /** Couches dont les éléments se cliquent : le curseur le montre à leur survol. */
  clickableLayerIds?: string[];
  children?: ReactNode;
};

/** Carte d'un tracé : les arrêts numérotés reliés par le tracé (à défaut, une ligne brisée). */
export default function RoutePreview({
  stops,
  route,
  onClick,
  clickableLayerIds,
  children,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const style = useMemo(mapStyle, []);
  const colors = mapColors();
  const interactive = Boolean(onClick);
  const [overClickable, setOverClickable] = useState(false);

  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates:
              route ?? stops.map((stop) => [stop.lng, stop.lat] as const),
          },
        },
        ...stops.map((stop, index) => ({
          type: "Feature" as const,
          properties: {
            label: stop.label,
            city: stop.city,
            rank: `${index + 1}`,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [stop.lng, stop.lat],
          },
        })),
      ],
    }),
    [stops, route],
  );

  useEffect(() => {
    const map = mapRef.current;
    const bounds = boundsOf(stops);
    if (!map || !bounds) return;
    const allVisible = stops.every((stop) =>
      map.getBounds().contains([stop.lng, stop.lat]),
    );
    if (!interactive || !allVisible) {
      map.fitBounds(bounds, { padding: 56, maxZoom: 11, duration: 0 });
    }
  }, [stops, interactive]);

  const initialBounds = boundsOf(stops);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={
        initialBounds
          ? { bounds: initialBounds, fitBoundsOptions: { padding: 56 } }
          : DEFAULT_VIEW
      }
      mapStyle={style}
      attributionControl={false}
      interactive={interactive}
      interactiveLayerIds={clickableLayerIds}
      onClick={onClick}
      onMouseEnter={() => setOverClickable(true)}
      onMouseLeave={() => setOverClickable(false)}
      cursor={overClickable ? "pointer" : interactive ? "grab" : "default"}
    >
      {!interactive && <PlaceNamesLayer />}
      {children}
      <Source id="route-preview" type="geojson" data={data}>
        <Layer
          id="route-preview-casing"
          type="line"
          filter={["==", ["geometry-type"], "LineString"]}
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": colors.white, "line-width": 8 }}
        />
        <Layer
          id="route-preview-line"
          type="line"
          filter={["==", ["geometry-type"], "LineString"]}
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": colors.liane, "line-width": 4 }}
        />
        <Layer
          id="route-preview-stops"
          type="circle"
          filter={["==", ["geometry-type"], "Point"]}
          paint={{
            "circle-radius": 10,
            "circle-color": colors.liane,
            "circle-stroke-width": 2,
            "circle-stroke-color": colors.white,
          }}
        />
        <Layer
          id="route-preview-ranks"
          type="symbol"
          filter={["==", ["geometry-type"], "Point"]}
          layout={{
            "text-field": ["get", "rank"],
            "text-font": MAP_FONT,
            "text-size": 11,
            "text-allow-overlap": true,
          }}
          paint={{ "text-color": colors.white }}
        />
        <Layer
          id="route-preview-labels"
          type="symbol"
          filter={["==", ["geometry-type"], "Point"]}
          layout={{
            "text-field": POINT_TEXT_FIELD,
            "text-font": MAP_FONT,
            "text-size": 12,
            "text-variable-anchor": ["right", "left", "top", "bottom"],
            "text-radial-offset": 1.1,
            "text-justify": "auto",
            "text-max-width": 8,
          }}
          paint={{
            "text-color": colors.encre,
            "text-halo-color": colors.white,
            "text-halo-width": 1.5,
          }}
        />
      </Source>
    </MapGL>
  );
}
