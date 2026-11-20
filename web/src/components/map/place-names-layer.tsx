"use client";

import { Layer, Source } from "react-map-gl/maplibre";
import { HAS_BASEMAP, MAP_FONT, mapColors, tilesUrl } from "./map-style";

/** Sans fond de carte, les noms des communes (points de ralliement) servent de repères. */
export function PlaceNamesLayer() {
  if (HAS_BASEMAP) return null;
  const colors = mapColors();
  return (
    <Source
      id="place_names"
      type="vector"
      tiles={[tilesUrl("rallying_point_display")]}
      minzoom={8}
      maxzoom={14}
    >
      <Layer
        id="place-names"
        type="symbol"
        source-layer="rallying_point_display"
        minzoom={8}
        layout={{
          "text-field": ["get", "city"],
          "text-font": MAP_FONT,
          "text-size": 11,
          "text-max-width": 8,
          "text-padding": 12,
        }}
        paint={{
          "text-color": colors.gris,
          "text-halo-color": colors.pierre,
          "text-halo-width": 1,
        }}
      />
    </Source>
  );
}
