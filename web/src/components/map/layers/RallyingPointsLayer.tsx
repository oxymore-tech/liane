"use client";

import { useMapContext } from "@/components/map/Map";
import { MutableRefObject, useCallback, useEffect, useMemo } from "react";
import { NodeAppEnv } from "@/api/env";
import { dispatchHighlightPointEvent } from "@/components/charts/timeline/Timeline";
import maplibregl, { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import { SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { MarkersLayer } from "@/components/map/layers/base/MarkersLayer";
import { GeoJSON } from "geojson";

export type RallyingPointsLayerProps = {
  useLianeIcon?: boolean;
  onClickPoint?: (e: MapGeoJSONFeature, ctrlKey: boolean) => void;
  highlightedFeatures?: MapGeoJSONFeature[];
};

export function RallyingPointsLayer({ useLianeIcon = true, onClickPoint, highlightedFeatures }: RallyingPointsLayerProps) {
  const map = useMapContext();

  const onClickListener = onClickPoint
    ? (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => {
        console.log(e);
        if (e.features && e.features.length > 0) {
          onClickPoint(e.features[0], e.originalEvent.ctrlKey);
        }
      }
    : undefined;
  useEffect(() => {
    const url = NodeAppEnv.rallyingPointsTilesUrl;
    map.current?.once("load", () => {
      if (map.current?.getSource("rallying_point_display")) {
        return;
      }
      map.current?.addSource("rallying_point_display", {
        type: "vector",
        url,
        promoteId: "id"
      });

      if (useLianeIcon) {
        map.current?.loadImage("/rp_pink.png", function (error, image) {
          if (error) throw error;

          if (!image) console.warn("No image found");
          else map.current?.addImage("rp_active", image);
        });

        map.current?.loadImage("/rp_gray.png", function (error, image) {
          if (error) throw error;

          if (!image) console.warn("No image found");
          else map.current?.addImage("rp_inactive", image);
        });
        map.current?.addLayer({
          id: "rallying_point_display",
          "source-layer": "rallying_point_display",
          source: "rallying_point_display",
          type: "symbol",
          minzoom: 8,
          layout: {
            "icon-image": "rp_active",
            "text-size": 12,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.16, 9, 0.24, 11, 0.36],
            "text-field": ["step", ["zoom"], "", 11, ["get", "label"]],
            "text-allow-overlap": false,
            "icon-allow-overlap": true,
            "text-anchor": "bottom",
            "text-offset": [0, -3.4],
            "text-max-width": 5.4,
            "text-optional": true,
            "icon-optional": false,
            "icon-anchor": "bottom"
          },
          paint: { "text-halo-width": 1.5, "text-color": "#52070c", "text-halo-color": "#fff" }
        });

        if (onClickListener) {
          map.current?.on("click", "rallying_point_display", onClickListener);
        }
      }

      return () => {
        if (useLianeIcon) {
          map.current?.removeImage("rp_active");
          map.current?.removeImage("rp_inactive");
          map.current?.removeLayer("rallying_point_display");
          if (onClickListener) {
            map.current?.off("click", "rallying_point_display", onClickListener);
          }
        }

        map.current?.removeSource("rallying_point_display");
      };
    });
  }, [map, useLianeIcon, onClickPoint]);

  const component = useMemo(() => {
    return useLianeIcon ? (
      <></>
    ) : (
      <MarkersLayer
        id={"rallying_point_display"}
        source={"rallying_point_display"}
        onClickPoint={onClickListener}
        props={{
          minzoom: 8,
          "source-layer": "rallying_point_display",
          layout: {
            "icon-image": "pin",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 9, 0.5, 11, 0.7],
            "icon-allow-overlap": true,
            "icon-optional": false,
            "icon-anchor": "bottom",
            "text-field": ["step", ["zoom"], "", 11, ["get", "label"]],
            "text-allow-overlap": false,
            "text-anchor": "bottom",
            "text-offset": [0, -3.4],
            "text-max-width": 5.4,
            "text-size": 12,
            "text-optional": true
          },
          paint: {
            "text-halo-width": 1.5,
            "text-color": ["case", ["boolean", ["feature-state", "selected"], false], "#073852", "#52070c"],
            "text-halo-color": "#fff",
            "icon-color": ["case", ["boolean", ["feature-state", "selected"], false], "#0094ff", "#e35374"],
            "icon-halo-color": "#000",
            "icon-halo-width": 0.6
          }
        }}
      />
    );
  }, [useLianeIcon, map]);

  useEffect(() => {
    highlightedFeatures?.forEach(f => {
      map.current?.setFeatureState({ source: "rallying_point_display", sourceLayer: "rallying_point_display", id: f.id }, { selected: true });
    });
    return () => {
      highlightedFeatures?.forEach(f => {
        map.current?.setFeatureState({ source: "rallying_point_display", sourceLayer: "rallying_point_display", id: f.id }, { selected: false });
      });
    };
  }, [map, highlightedFeatures]);
  return component;
}
