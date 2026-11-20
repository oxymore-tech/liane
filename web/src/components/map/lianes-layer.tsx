"use client";

import type { ExpressionSpecification } from "maplibre-gl";
import { Layer, Source } from "react-map-gl/maplibre";
import type { Liane } from "@/api/types";
import { MAP_FONT, mapColors, tilesUrl } from "./map-style";

export const LIANES_TOUCH_LAYER_ID = "lianes-touch";
export const LIANE_STOPS_LAYER_ID = "liane-stops-circle";
/** Largeur de la zone sensible autour d'un trait : un doigt, pas un pixel. */
export const LIANES_TOUCH_WIDTH_PIXELS = 28;

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

/** Épaisseur d'un tronçon selon le total des membres des lianes qui l'empruntent. */
const widthByMembers = (thin: number, medium: number, thick: number) =>
  [
    "interpolate",
    ["linear"],
    ["get", "member_count"],
    0,
    thin,
    5,
    medium,
    20,
    thick,
  ] as ExpressionSpecification;

/**
 * Lianes en traits, nom au milieu, arrêts en points. Là où plusieurs lianes empruntent la même route,
 * les tuiles ne donnent qu'un tronçon : un seul trait, plus épais. La liane choisie est plus épaisse
 * encore, avec un filet vert pousse en son milieu.
 */
export function LianesLayer({
  lianes,
  selectedSlug,
}: {
  lianes: Liane[];
  selectedSlug: string | null;
}) {
  const colors = mapColors();
  const isSelected: ExpressionSpecification = [
    "in",
    `|${selectedSlug ?? "-"}|`,
    ["get", "slugs"],
  ];
  return (
    <>
      <Source
        id="lianes"
        type="vector"
        tiles={[tilesUrl("liane_segment_display")]}
        minzoom={0}
        maxzoom={14}
      >
        <Layer
          id="lianes-casing"
          type="line"
          source-layer="liane_segment_display"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": colors.white,
            "line-width": [
              "+",
              widthByMembers(7, 11, 16),
              ["case", isSelected, 5, 0],
            ],
          }}
        />
        <Layer
          id="lianes-line"
          type="line"
          source-layer="liane_segment_display"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": colors.liane,
            "line-width": [
              "+",
              widthByMembers(4, 7, 12),
              ["case", isSelected, 5, 0],
            ],
          }}
        />
        <Layer
          id="lianes-selected"
          type="line"
          source-layer="liane_segment_display"
          filter={isSelected}
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": colors.pousse, "line-width": 3 }}
        />
        <Layer
          id={LIANES_TOUCH_LAYER_ID}
          type="line"
          source-layer="liane_segment_display"
          paint={{
            "line-color": colors.encre,
            "line-opacity": 0,
            "line-width": LIANES_TOUCH_WIDTH_PIXELS,
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
          id={LIANE_STOPS_LAYER_ID}
          type="circle"
          source-layer="liane_stop_display"
          paint={{
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 12, 7],
            "circle-color": colors.white,
            "circle-stroke-width": 2.5,
            "circle-stroke-color": colors.liane,
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
            "text-color": colors.encre,
            "text-halo-color": colors.white,
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
            "text-color": colors.liane,
            "text-halo-color": colors.white,
            "text-halo-width": 2,
          }}
        />
      </Source>
    </>
  );
}
