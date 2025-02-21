import { SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import React, { useEffect } from "react";
import { Layer, useMap } from "react-map-gl/maplibre";

type MarkersLayerProps = {
  id: string;
  source: string;
  props: Partial<SymbolLayerSpecification>;
  onMouseLeavePoint?: (id: number) => void;
  onMouseEnterPoint?: (feature: MapGeoJSONFeature) => void;
  onClickPoint?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
};

export const MarkersLayer = ({ source, id, props: { layout, ...rest }, onMouseLeavePoint, onMouseEnterPoint, onClickPoint }: MarkersLayerProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map.current) {
      return;
    }

    const currentMap = map.current;

    let hovered = new Set<number>();
    const onMove = (e: MapMouseEvent) => {
      const fs = currentMap.queryRenderedFeatures(e.point, { layers: [id] });
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

    if (onMouseLeavePoint || onMouseEnterPoint) currentMap.on("mousemove", onMove);
    if (onClickPoint) currentMap.on("click", source, onClickPoint);

    return () => {
      if (onMouseLeavePoint || onMouseEnterPoint) {
        currentMap.off("mousemove", source, onMove);
        hovered.forEach(id => onMouseLeavePoint?.(id));
      }
      if (onClickPoint) currentMap.off("click", source, onClickPoint);
    };
  }, [source, onMouseEnterPoint, onMouseLeavePoint, onClickPoint, map, id]);

  return (
    <Layer
      id={id}
      source={source}
      {...rest}
      type="symbol"
      layout={{
        ...layout,
        "icon-image": "pin",
        "icon-size": 2,
        "icon-allow-overlap": true,
        "icon-optional": false,
        "icon-anchor": "bottom"
      }}
    />
  );
};
