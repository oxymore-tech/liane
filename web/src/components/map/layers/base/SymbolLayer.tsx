import { useMapContext } from "@/components/map/Map";
import { SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import React, { useEffect } from "react";

export const SymbolLayer = (config: SymbolLayerConfig) => {
  useSymbolLayer(config);
  return <></>;
};

export type SymbolLayerConfig = {
  id: string;
  source: string;
  props: Partial<SymbolLayerSpecification>;
  onMouseLeavePoint?: (id: number) => void;
  onMouseEnterPoint?: (feature: MapGeoJSONFeature) => void;
  onClickPoint?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
};

export const useSymbolLayer = ({ source, id, props, onMouseLeavePoint, onMouseEnterPoint, onClickPoint }: SymbolLayerConfig) => {
  const map = useMapContext();

  useEffect(() => {
    //console.log(!map.current, map.current?.getLayer(id), !map.current?.getSource(source));

    if (map.current && !map.current?.getLayer(id) && map.current?.getSource(source))
      map.current?.addLayer(
        {
          ...props,
          id: id,
          source: source,
          type: "symbol"
        },
        "State labels" // below major labels
      );

    return () => {
      console.log("remove", map.current?.loaded());
      if (!map.current?.loaded()) return;
      map.current?.removeLayer(id);
    };
  }, [id, map, props, source]);

  useEffect(() => {
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
  }, [source, onMouseEnterPoint, onMouseLeavePoint, onClickPoint, map]);
};