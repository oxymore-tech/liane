import { useMapContext } from "@/components/map/Map";
import { SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import React, { useEffect, useMemo, useState } from "react";
import { SymbolLayer } from "@/components/map/layers/base/SymbolLayer";

export const MarkersLayer = (config: MarkersLayerConfig) => {
  useMarkersLayer(config);
  return <></>;
};

export type MarkersLayerConfig = {
  id: string;
  source: string;
  props: Partial<SymbolLayerSpecification>;
  onMouseLeavePoint?: (id: number) => void;
  onMouseEnterPoint?: (feature: MapGeoJSONFeature) => void;
  onClickPoint?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
};

export const useMarkersLayer = ({ source, id, props, onMouseLeavePoint, onMouseEnterPoint, onClickPoint }: MarkersLayerConfig) => {
  const map = useMapContext();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const loadImage = () =>
      map.current?.loadImage("/pin.png", function (error, image) {
        if (error) throw error;
        if (!image) console.warn("No image found");
        else if (!map.current?.hasImage("pin")) {
          map.current?.addImage("pin", image, { sdf: true });
          setReady(true);
        }
        console.log("here");
      });

    console.log(map.current?.loaded());
    if (map.current?.loaded()) loadImage();
    else map.current?.once("load", loadImage);
    return () => {
      if (map.current?.hasImage("pin")) map.current?.removeImage("pin");
    };
  }, [map]);
  useEffect(() => {
    if (!ready) return;
    if (!map.current || map.current?.getLayer(id) || !map.current?.getSource(source)) return;

    map.current?.addLayer({
      ...props,
      id: id,
      source: source,
      type: "symbol",
      layout: {
        ...props.layout,
        "icon-image": "pin",
        "icon-allow-overlap": true,
        "icon-optional": false,
        "icon-anchor": "bottom"
      }
    });

    return () => {
      if (!map.current?.loaded()) return;
      map.current?.removeLayer(id);
    };
  }, [id, map, props, source, ready]);

  useEffect(() => {
    if (!ready) return;

    let hovered = new Set<number>();
    const onMove = (e: MapMouseEvent) => {
      const fs = map.current?.queryRenderedFeatures(e.point, { layers: [id] });
      if (!fs) return;
      const newHovered = new Set<number>();
      if (fs.length > 0) {
        fs.forEach(f => {
          const id = f.id as number;
          if (!hovered.has(id)) {
            onMouseEnterPoint?.(f);
          }
          newHovered.add(id);
          hovered.delete(id);
        });
      }
      hovered.forEach(id => onMouseLeavePoint?.(id));
      hovered = newHovered;
    };

    if (onMouseLeavePoint || onMouseEnterPoint) map.current?.on("mousemove", onMove);
    if (onClickPoint) map.current?.on("click", source, onClickPoint);

    return () => {
      if (onMouseLeavePoint || onMouseEnterPoint) {
        map.current?.off("mousemove", source, onMove);
        hovered.forEach(id => onMouseLeavePoint?.(id));
      }
      if (onClickPoint) map.current?.off("click", source, onClickPoint);
    };
  }, [ready, source, onMouseEnterPoint, onMouseLeavePoint, onClickPoint, map]);
};

export const RPMarkersLayer = ({
  onClickListener,
  sourceId
}: {
  sourceId: string;
  onClickListener?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
}) => {
  const map = useMapContext();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const loadImage = () =>
      map.current?.loadImage("/pin.png", function (error, image) {
        if (error) throw error;
        if (!image) console.warn("No image found");
        else if (!map.current?.hasImage("pin")) {
          map.current?.addImage("pin", image, { sdf: true });
          setReady(true);
        }
        console.log("here");
      });

    console.log(map.current?.loaded());
    if (map.current?.loaded()) loadImage();
    else map.current?.once("idle", loadImage);
    return () => {
      if (map.current?.hasImage("pin")) map.current?.removeImage("pin");
    };
  }, [map]);
  console.log("ready", ready);

  return useMemo(
    () =>
      ready ? (
        <SymbolLayer
          id={sourceId}
          source={sourceId}
          onClickPoint={onClickListener}
          props={{
            //   minzoom: 8,

            layout: {
              "icon-image": "pin",
              "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 9, 0.5, 11, 0.7],
              "icon-allow-overlap": true,
              "icon-optional": false,
              "icon-anchor": "bottom",
              "text-field": "", //["step", ["zoom"], "", 11, ["get", "label"]],
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
      ) : null,
    [onClickListener, ready, sourceId]
  );
};
