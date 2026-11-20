import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import { MAPTILER_KEY, TILES_PATH } from "@/api/env";

export const MAP_FONT = ["Noto Sans Regular"];
export const HAS_BASEMAP = MAPTILER_KEY !== "";

/**
 * Étiquette d'un point de ralliement sur une carte, comme `PointName` : son nom, puis sa commune
 * en plus petit si le nom ne la contient pas déjà.
 */
export const POINT_TEXT_FIELD: ExpressionSpecification = [
  "case",
  [
    "any",
    ["==", ["get", "city"], ""],
    ["in", ["get", "city"], ["get", "label"]],
  ],
  ["get", "label"],
  [
    "format",
    ["get", "label"],
    {},
    "\n",
    {},
    ["get", "city"],
    { "font-scale": 0.85 },
  ],
];

type MapColors = {
  liane: string;
  pousse: string;
  pierre: string;
  encre: string;
  gris: string;
  white: string;
};

let colors: MapColors | null = null;

/** Les couleurs de la carte sont celles du thème (`@theme` de globals.css), lues une fois dans la page. */
export function mapColors(): MapColors {
  if (!colors) {
    const theme = getComputedStyle(document.documentElement);
    const color = (name: string) =>
      theme.getPropertyValue(`--color-${name}`).trim();
    colors = {
      liane: color("liane"),
      pousse: color("pousse"),
      pierre: color("pierre"),
      encre: color("encre"),
      gris: color("gris"),
      white: color("white"),
    };
  }
  return colors;
}

export const DEFAULT_VIEW = { longitude: 3.5, latitude: 44.5, zoom: 8 };

/** Les tuiles passent par la réécriture `/tiles` de Next ; MapLibre exige une adresse absolue. */
export const tilesUrl = (source: string) =>
  `${window.location.origin}${TILES_PATH}/${source}/{z}/{x}/{y}`;

/** Sans clé MapTiler, un fond neutre avec des polices servies par l'application. */
export function mapStyle(): string | StyleSpecification {
  if (HAS_BASEMAP) {
    return `https://api.maptiler.com/maps/dataviz-light/style.json?key=${MAPTILER_KEY}`;
  }
  return {
    version: 8,
    glyphs: `${window.location.origin}/fonts/{fontstack}/{range}.pbf`,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": mapColors().pierre },
      },
    ],
  };
}

export function boundsOf(
  points: { lat: number; lng: number }[],
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  const lngs = points.map((point) => point.lng);
  const lats = points.map((point) => point.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}
