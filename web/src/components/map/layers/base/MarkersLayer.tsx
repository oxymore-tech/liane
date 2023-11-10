import { useMapContext } from "@/components/map/Map";
import { SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import React, { useEffect, useState } from "react";

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
    map.current?.once("load", () => {
      map.current?.loadImage("/pin.png", function (error, image) {
        if (error) throw error;
        if (!image) console.warn("No image found");
        else if (!map.current?.hasImage("pin")) {
          map.current?.addImage("pin", image, { sdf: true });
          setReady(true);
        }
      });
      return () => {
        if (map.current?.hasImage("pin")) map.current?.removeImage("pin");
      };
    });
  }, [map]);
  useEffect(() => {
    if (!ready) return;
    if (!map.current || map.current?.getLayer(source) || !map.current?.getSource(source)) return;

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
      const fs = map.current?.queryRenderedFeatures(e.point, { layers: [source] });
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
