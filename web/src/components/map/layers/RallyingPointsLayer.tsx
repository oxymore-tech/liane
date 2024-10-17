"use client";

import { useMapContext } from "@/components/map/Map";
import { useEffect, useMemo, useState } from "react";
import { NodeAppEnv } from "@/api/env";
import { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import { MarkersLayer } from "@/components/map/layers/base/MarkersLayer";

export type RallyingPointsLayerProps = {
  useLianeIcon?: boolean;
  onClickPoint?: (e: MapGeoJSONFeature, ctrlKey: boolean) => void;
  highlightedFeatures?: MapGeoJSONFeature[];
};

export function RallyingPointsLayer({ useLianeIcon = true, onClickPoint, highlightedFeatures }: RallyingPointsLayerProps) {
  const map = useMapContext();

  // Add source for rallying points
  useEffect(() => {
    const addSource = () => {
      if (map.current?.getSource("rallying_point_display")) {
        //WebLogger.debug("Rallying points source is already loaded");
        return;
      }
      //WebLogger.debug("Adding rallying points source");
      map.current?.addSource("rallying_point_display", {
        type: "vector",
        url,
        promoteId: "id"
      });
    };
    //WebLogger.debug("Map loaded state is", map.current?.loaded());
    const url = NodeAppEnv.rallyingPointsTilesUrl;
    map.current?.once("load", () => {
      addSource();
    });
    return () => {
      if (map.current?.getSource("rallying_point_display")) map.current?.removeSource("rallying_point_display");
    };
  }, [map]);

  // Create component
  const component = useMemo(() => {
    const onClickListener = onClickPoint
      ? (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => {
          if (e.features && e.features.length > 0) {
            onClickPoint(e.features[0], e.originalEvent.ctrlKey);
          }
        }
      : undefined;
    return useLianeIcon ? <RPIconLayer onClickListener={onClickListener} /> : <RPMarkersLayer onClickListener={onClickListener} />;
  }, [useLianeIcon, onClickPoint]);

  // Set hovered features state
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

const RPIconLayer = ({
  onClickListener
}: {
  onClickListener?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
}) => {
  const map = useMapContext();
  const [images, setImages] = useState([] as string[]);

  // Load layer icons
  useEffect(() => {
    map.current?.once("load", () => {
      map.current?.loadImage("/rp_pink.png", function (error, image) {
        if (error) throw error;

        if (!image) console.warn("No image found");
        else {
          if (!map.current?.getImage("rp_active")) map.current?.addImage("rp_active", image);
          setImages(old => [...old, "rp_active"]);
        }
      });

      map.current?.loadImage("/rp_pink_blank.png", function (error, image) {
        if (error) throw error;

        if (!image) console.warn("No image found");
        else {
          if (!map.current?.getImage("rp_pink_blank")) map.current?.addImage("rp_pink_blank", image);
          setImages(old => [...old, "rp_pink_blank"]);
        }
      });

      map.current?.loadImage("/rp_gray.png", function (error, image) {
        if (error) throw error;

        if (!image) console.warn("No image found");
        else {
          if (!map.current?.getImage("rp_inactive")) map.current?.addImage("rp_inactive", image);
          setImages(old => [...old, "rp_inactive"]);
        }
      });
    });
    return () => {
      if (map.current?.getImage("rp_active")) map.current?.removeImage("rp_active");
      if (map.current?.getImage("rp_pink_blank")) map.current?.removeImage("rp_pink_blank");
      if (map.current?.getImage("rp_inactive")) map.current?.removeImage("rp_inactive");
    };
  }, [map]);

  const ready = useMemo(() => images.length >= 2, [images.length]);

  // Add layer once icons are ready
  useEffect(() => {
    //WebLogger.debug(ready, map.current?.getSource("rallying_point_display"), !map.current?.getLayer("rallying_point_display"));
    if (ready && map.current?.getSource("rallying_point_display") && !map.current?.getLayer("rallying_point_display")) {
      map.current?.addLayer({
        id: "rallying_point_display_cluster",
        "source-layer": "rallying_point_display",
        source: "rallying_point_display",
        type: "symbol",
        minzoom: 8,
        filter: ["has", "point_count"],
        layout: {
          "icon-image": "rp_pink_blank",
          "text-size": 14,
          "text-field": ["get", "point_count"],
          "text-allow-overlap": false,
          "icon-allow-overlap": true,
          "text-anchor": "center",
          "text-max-width": 5.4,
          "text-optional": true,
          "icon-optional": false,
          "icon-anchor": "center",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 9, 0.24, 11, 0.36]
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(255, 255, 255)",
          "text-halo-width": 0.2
        }
      });
      map.current?.addLayer({
        id: "rallying_point_display",
        "source-layer": "rallying_point_display",
        source: "rallying_point_display",
        type: "symbol",
        minzoom: 8,
        filter: ["!", ["has", "point_count"]],
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
    }

    return () => {
      if (map.current?.getLayer("rallying_point_display")) map.current?.removeLayer("rallying_point_display");
    };
  }, [map, ready]);

  // Add click listener
  useEffect(() => {
    if (!onClickListener || !ready || !map.current?.getLayer("rallying_point_display")) return;

    map.current?.on("click", "rallying_point_display", onClickListener);
    return () => {
      map.current?.off("click", "rallying_point_display", onClickListener);
    };
  }, [map, onClickListener, ready]);
  return <></>;
};

const RPMarkersLayer = ({
  onClickListener
}: {
  onClickListener?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
}) => {
  return (
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
};
