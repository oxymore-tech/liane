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
  onMouseLeavePoint?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
  onMouseEnterPoint?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
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

    if (onMouseEnterPoint) map.current?.on("mouseenter", source, onMouseEnterPoint);
    if (onMouseLeavePoint) map.current?.on("mouseenter", source, onMouseLeavePoint);
    if (onClickPoint) map.current?.on("click", source, onClickPoint);

    return () => {
      if (!map.current?.loaded()) return;
      map.current?.removeLayer(id);
      if (onMouseEnterPoint) map.current?.off("mouseenter", source, onMouseEnterPoint);
      if (onMouseLeavePoint) map.current?.off("mouseenter", source, onMouseLeavePoint);
      if (onClickPoint) map.current?.off("click", source, onClickPoint);
    };
  }, [id, map, onMouseEnterPoint, onMouseLeavePoint, onClickPoint, props, source, ready]);
};
