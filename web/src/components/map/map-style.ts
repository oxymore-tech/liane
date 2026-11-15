import type { StyleSpecification } from "maplibre-gl";
import { MAPTILER_KEY, TILES_PATH } from "@/api/env";

export const MAP_FONT = ["Noto Sans Regular"];
export const HAS_BASEMAP = MAPTILER_KEY !== "";
export const LIANE_COLOR = "#059669";
export const LIANE_SELECTED_COLOR = "#7c3aed";
export const LIANE_SHARED_CASING_COLOR = "#064e3b";

export const DEFAULT_VIEW = { longitude: 3.5, latitude: 44.5, zoom: 8 };

/** Les tuiles passent par la réécriture `/tiles` de Next ; MapLibre exige une adresse absolue. */
export const tilesUrl = (source: string) =>
  `${window.location.origin}${TILES_PATH}/${source}/{z}/{x}/{y}`;

/** Sans clé MapTiler, un fond neutre avec des polices servies par l'application. */
export function mapStyle(): string | StyleSpecification {
  if (HAS_BASEMAP) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;
  }
  return {
    version: 8,
    glyphs: `${window.location.origin}/fonts/{fontstack}/{range}.pbf`,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#f1f0ea" },
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
