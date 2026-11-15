"use client";

import { Layer, Source } from "react-map-gl/maplibre";
import type { Liane } from "@/api/types";
import {
  LIANE_COLOR,
  LIANE_SELECTED_COLOR,
  MAP_FONT,
  tilesUrl,
} from "./map-style";

export const LIANES_TOUCH_LAYER_ID = "lianes-touch";

/** Le nom d'une liane s'affiche au milieu de son tracé. */
function middleOf(liane: Liane): [number, number] {
  const line =
    liane.route?.coordinates ?? liane.stops.map((stop) => [stop.lng, stop.lat]);
  const lengths = line
    .slice(1)
    .map((point, index) =>
      Math.hypot(point[0] - line[index][0], point[1] - line[index][1]),
    );
  let remaining = lengths.reduce((total, length) => total + length, 0) / 2;
  for (const [index, length] of lengths.entries()) {
    if (remaining <= length && length > 0) {
      const ratio = remaining / length;
      return [
        line[index][0] + (line[index + 1][0] - line[index][0]) * ratio,
        line[index][1] + (line[index + 1][1] - line[index][1]) * ratio,
      ];
    }
    remaining -= length;
  }
  return [line[0][0], line[0][1]];
}

const nameFeatures = (lianes: Liane[]) => ({
  type: "FeatureCollection" as const,
  features: lianes.map((liane) => ({
    type: "Feature" as const,
    properties: {
      name: liane.name,
      slug: liane.slug,
      member_count: liane.member_count,
    },
    geometry: { type: "Point" as const, coordinates: middleOf(liane) },
  })),
});

/** Lianes en traits (épaisseur selon le nombre de membres), nom au milieu, arrêts en points. */
export function LianesLayer({
  lianes,
  selectedSlug,
}: {
  lianes: Liane[];
  selectedSlug: string | null;
}) {
  return (
    <>
      <Source
        id="lianes"
        type="vector"
        tiles={[tilesUrl("liane_display")]}
        minzoom={0}
        maxzoom={14}
      >
        <Layer
          id="lianes-casing"
          type="line"
          source-layer="liane_display"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": "#ffffff",
            "line-width": [
              "interpolate",
              ["linear"],
              ["get", "member_count"],
              0,
              6,
              5,
              10,
              20,
              15,
            ],
          }}
        />
        <Layer
          id="lianes-line"
          type="line"
          source-layer="liane_display"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": [
              "case",
              ["==", ["get", "slug"], selectedSlug ?? ""],
              LIANE_SELECTED_COLOR,
              LIANE_COLOR,
            ],
            "line-width": [
              "interpolate",
              ["linear"],
              ["get", "member_count"],
              0,
              3,
              5,
              7,
              20,
              12,
            ],
          }}
        />
        <Layer
          id={LIANES_TOUCH_LAYER_ID}
          type="line"
          source-layer="liane_display"
          paint={{
            "line-color": "#000000",
            "line-opacity": 0,
            "line-width": 28,
          }}
        />
      </Source>
      <Source
        id="liane_stops"
        type="vector"
        tiles={[tilesUrl("liane_stop_display")]}
        minzoom={0}
        maxzoom={14}
      >
        <Layer
          id="liane-stops-circle"
          type="circle"
          source-layer="liane_stop_display"
          paint={{
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 12, 7],
            "circle-color": "#ffffff",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#065f46",
          }}
        />
        <Layer
          id="liane-stops-label"
          type="symbol"
          source-layer="liane_stop_display"
          layout={{
            "text-field": ["get", "city"],
            "text-font": MAP_FONT,
            "text-size": 12,
            "text-variable-anchor": ["top", "left", "right", "bottom"],
            "text-radial-offset": 0.8,
            "text-justify": "auto",
            "text-max-width": 8,
          }}
          paint={{
            "text-color": "#1f2937",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          }}
        />
      </Source>
      <Source id="liane_names" type="geojson" data={nameFeatures(lianes)}>
        <Layer
          id="lianes-name"
          type="symbol"
          layout={{
            "text-field": ["get", "name"],
            "text-font": MAP_FONT,
            "text-size": 14,
            "text-variable-anchor": ["bottom", "top", "left", "right"],
            "text-radial-offset": 0.7,
            "text-justify": "auto",
            "text-max-width": 9,
            "symbol-sort-key": ["-", ["get", "member_count"]],
          }}
          paint={{
            "text-color": [
              "case",
              ["==", ["get", "slug"], selectedSlug ?? ""],
              LIANE_SELECTED_COLOR,
              "#065f46",
            ],
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          }}
        />
      </Source>
    </>
  );
}
