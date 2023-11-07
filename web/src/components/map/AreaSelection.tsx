"use client";

import { useMapContext } from "@/components/map/Map";
import { useEffect, useRef, useState } from "react";
import { EmptyFeatureCollection } from "@liane/common";
import maplibregl, { GeoJSONSource, IControl, LngLat, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import bboxPolygon from "@turf/bbox-polygon";
import { featureCollection } from "@turf/helpers";
import React from "react";

class SelectControl implements IControl {
  private active: boolean = false;
  private debouncingClick = false;
  _map: maplibregl.Map | undefined;
  _container: any;
  constructor(private onClick: (active: boolean) => void) {}
  onAdd(map: maplibregl.Map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl bg-gray-100 rounded-md";
    this._container.innerHTML =
      '<button title="Select" id="box-select-control" class="border-2 border-gray-300 bg-white p-[6px] rounded-md cursor-pointer hover:bg-gray-100">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-select"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></svg>' +
      "</button>";
    this._container.addEventListener("click", this._onClick);
    return this._container;
  }

  onRemove() {
    this._container?.parentNode.removeChild(this._container);
    this._container?.removeEventListener("click", this._onClick);
    this._map = undefined;
  }

  setActive(active: boolean) {
    const control = document.querySelector("#box-select-control");
    const mapCanvas = this._map?.getCanvas();
    if (!control) return;
    this.active = active;
    if (active) {
      control.className = "border-2 border-blue-400 bg-blue-100 p-[6px] rounded-md cursor-pointer hover:bg-gray-100";
      if (mapCanvas) mapCanvas.className = "cursor-crosshair";
    } else {
      control.className = "border-2 border-gray-300 bg-white p-[6px] rounded-md cursor-pointer hover:bg-gray-100";
      if (mapCanvas) mapCanvas.className = "cursor-grab";
    }
  }
  _onClick = () => {
    if (this.debouncingClick) return;
    this.debouncingClick = true;
    setTimeout(() => (this.debouncingClick = false), 400);
    this.onClick(this.active);
  };
}

const generatePolygon = (ne: LngLat, sw: LngLat) => {
  const bbox = [Math.min(ne.lng, sw.lng), Math.min(ne.lat, sw.lat), Math.max(ne.lng, sw.lng), Math.max(ne.lat, sw.lat)];
  return bboxPolygon(bbox);
};

export type AreaSelectionProps = {
  targetLayers: string[];
  onSelectFeatures: (features: MapGeoJSONFeature[], ctrlKey: boolean) => void;
  onToggleTool?: (active: boolean) => void;
  onHoverFeatureStateChanged?: (f: MapGeoJSONFeature, hovered: boolean) => void;
};
export const AreaSelection = ({ targetLayers, onSelectFeatures, onHoverFeatureStateChanged, onToggleTool }: AreaSelectionProps) => {
  const map = useMapContext();
  const drawing = useRef<LngLat | null>(null);
  const control = useRef<SelectControl | null>(null);
  const [isDrawing, setDrawing] = useState(false);
  const [inAreaFeatures, setInAreaFeatures] = useState<MapGeoJSONFeature[] | undefined>();

  useEffect(() => {
    if (!onHoverFeatureStateChanged) return;
    inAreaFeatures?.forEach(f => {
      onHoverFeatureStateChanged(f, true);
    });
    return () => {
      inAreaFeatures?.forEach(f => {
        onHoverFeatureStateChanged(f, false);
      });
    };
  }, [onHoverFeatureStateChanged, inAreaFeatures]);

  useEffect(() => {
    const selectControl = new SelectControl(active => {
      setDrawing(!active);
      onToggleTool?.(!active);
    });
    control.current = selectControl;
    map.current?.addControl(selectControl, "top-left");
    return () => {
      map.current?.removeControl(selectControl);
    };
  }, [map, control, onToggleTool]);

  useEffect(() => {
    if (!isDrawing) return;

    const onClick = (e: MapMouseEvent) => {
      if (!drawing.current) {
        drawing.current = e.lngLat;
        if (!e.originalEvent.ctrlKey) onSelectFeatures([], false);
      } else {
        if (!map.current) return;
        // Stop drawing and query features
        const point1 = map.current.project(drawing.current);
        const features = map.current?.queryRenderedFeatures(
          [
            [Math.min(point1.x, e.point.x), Math.min(point1.y, e.point.y)],
            [Math.max(point1.x, e.point.x), Math.max(point1.y, e.point.y)]
          ],
          {
            layers: targetLayers
          }
        );
        if (features) {
          onSelectFeatures(features, e.originalEvent.ctrlKey);
          setInAreaFeatures(undefined);
        }
        (map.current?.getSource("selection") as GeoJSONSource | undefined)?.setData(EmptyFeatureCollection);
        drawing.current = null;
        setDrawing(false);
      }
    };

    const onMove = (e: MapMouseEvent) => {
      if (!drawing.current || !map.current) return;
      const f = featureCollection([generatePolygon(drawing.current, e.lngLat)]);
      (map.current.getSource("selection") as GeoJSONSource | undefined)?.setData(f);

      const point1 = map.current.project(drawing.current);
      const features = map.current.queryRenderedFeatures(
        [
          [Math.min(point1.x, e.point.x), Math.min(point1.y, e.point.y)],
          [Math.max(point1.x, e.point.x), Math.max(point1.y, e.point.y)]
        ],
        {
          layers: targetLayers
        }
      );
      setInAreaFeatures(features);
    };

    const addLayer = () => {
      if (map.current?.getSource("selection")) {
        return;
      }
      map.current?.addSource("selection", {
        type: "geojson",
        data: EmptyFeatureCollection
      });

      map.current?.addLayer({
        id: "selection",
        source: "selection",
        type: "fill",
        paint: {
          "fill-outline-color": "#000",
          "fill-color": "#b4b5b5",
          "fill-opacity": 0.3
        }
      });

      map.current?.on("click", onClick);
      map.current?.on("mousemove", onMove);
    };

    if (map.current?.loaded()) addLayer();
    else map.current?.once("load", addLayer);

    return () => {
      drawing.current = null;
      map.current?.removeLayer("selection");
      map.current?.removeSource("selection");
      map.current?.off("click", onClick);
      map.current?.off("mousemove", onMove);
    };
  }, [map, targetLayers, isDrawing, onSelectFeatures]);

  useEffect(() => {
    control.current?.setActive(isDrawing);
  }, [isDrawing]);

  return <></>;
};
