"use client";

import React, { useEffect, useRef, useState } from "react";
import { EmptyFeatureCollection } from "@liane/common";
import { GeoJSONSource, LngLat, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import bboxPolygon from "@turf/bbox-polygon";
import { featureCollection } from "@turf/helpers";
import { BBox } from "geojson";
import { ControlPanelToggle } from "@/components/map/ControlPanel";
import { Layer, Source, useMap } from "react-map-gl/maplibre";

interface SelectControl {
  setActive: (active: boolean) => void;
  addListener: (callback: (active: boolean) => void) => void;
  removeListener: (callback: (active: boolean) => void) => void;
}
export const AreaSelectionControl = ({ targetLayers, onSelectFeatures, onHoverFeatureStateChanged, onToggleTool }: AreaSelectionProps) => {
  const [active, setActive] = useState(false);
  const listeners = useRef<Set<(active: boolean) => void>>(new Set());
  const map = useMap();
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
    control.current?.setActive(isDrawing);
  }, [isDrawing]);

  useEffect(() => {
    const mapCanvas = map.current?.getCanvas();
    if (active) {
      if (mapCanvas) mapCanvas.className = "cursor-crosshair";
    } else {
      if (mapCanvas) mapCanvas.className = "cursor-grab";
    }
    setDrawing(active);
    onToggleTool?.(active);
  }, [active, map, onToggleTool]);

  return (
    <>
      <ControlPanelToggle label="Sélection" active={active} setActive={setActive}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-box-select">
          <path d="M5 3a2 2 0 0 0-2 2" />
          <path d="M19 3a2 2 0 0 1 2 2" />
          <path d="M21 19a2 2 0 0 1-2 2" />
          <path d="M5 21a2 2 0 0 1-2-2" />
          <path d="M9 3h1" />
          <path d="M9 21h1" />
          <path d="M14 3h1" />
          <path d="M14 21h1" />
          <path d="M3 9v1" />
          <path d="M21 9v1" />
          <path d="M3 14v1" />
          <path d="M21 14v1" />
        </svg>
      </ControlPanelToggle>
      {isDrawing && (
        <SelectionLayer
          isDrawing={isDrawing}
          setDrawing={setDrawing}
          targetLayers={targetLayers}
          onSelectFeatures={onSelectFeatures}
          setInAreaFeatures={setInAreaFeatures}
        />
      )}
    </>
  );
};

const generatePolygon = (ne: LngLat, sw: LngLat) => {
  const bbox = [Math.min(ne.lng, sw.lng), Math.min(ne.lat, sw.lat), Math.max(ne.lng, sw.lng), Math.max(ne.lat, sw.lat)];
  // @ts-ignore
  return bboxPolygon(bbox);
};

export type AreaSelectionProps = {
  targetLayers: string[];
  onSelectFeatures: (features: MapGeoJSONFeature[], ctrlKey: boolean, bbox?: BBox) => void;
  onToggleTool?: (active: boolean) => void;
  onHoverFeatureStateChanged?: (f: MapGeoJSONFeature, hovered: boolean) => void;
  //control: React.MutableRefObject<SelectControl>;
};

const SelectionLayer = ({
  isDrawing,
  setDrawing,
  onSelectFeatures,
  targetLayers,
  setInAreaFeatures
}: {
  isDrawing: boolean;
  setDrawing: (d: boolean) => void;
  targetLayers: string[];
  onSelectFeatures: (features: MapGeoJSONFeature[], ctrlKey: boolean, bbox?: BBox) => void;
  setInAreaFeatures: (f: MapGeoJSONFeature[] | undefined) => void;
}) => {
  const drawing = useRef<LngLat | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!isDrawing) {
      return;
    }
    if (!map.current) {
      return;
    }

    const currentMap = map.current;

    const onClick = (e: MapMouseEvent) => {
      if (!drawing.current) {
        drawing.current = e.lngLat;
        if (!e.originalEvent.ctrlKey) onSelectFeatures([], false);
      } else {
        if (!currentMap) return;
        // Stop drawing and query features
        const point1 = currentMap.project(drawing.current);
        const features = currentMap.queryRenderedFeatures(
          [
            [Math.min(point1.x, e.point.x), Math.min(point1.y, e.point.y)],
            [Math.max(point1.x, e.point.x), Math.max(point1.y, e.point.y)]
          ],
          {
            layers: targetLayers
          }
        );
        if (features) {
          const bbox: BBox = [
            Math.min(drawing.current!.lng, e.lngLat.lng),
            Math.min(drawing.current!.lat, e.lngLat.lat),
            Math.max(drawing.current!.lng, e.lngLat.lng),
            Math.max(drawing.current!.lat, e.lngLat.lat)
          ];
          onSelectFeatures(features, e.originalEvent.ctrlKey, bbox);
          setInAreaFeatures(undefined);
        }
        (currentMap.getSource("selection") as GeoJSONSource | undefined)?.setData(EmptyFeatureCollection);
        drawing.current = null;
        setDrawing(false);
      }
    };

    const onMove = (e: MapMouseEvent) => {
      if (!drawing.current || !currentMap) return;
      const f = featureCollection([generatePolygon(drawing.current, e.lngLat)]);
      (currentMap.getSource("selection") as GeoJSONSource | undefined)?.setData(f);

      const point1 = currentMap.project(drawing.current);
      const features = currentMap.queryRenderedFeatures(
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

    currentMap.on("click", onClick);
    currentMap.on("mousemove", onMove);

    return () => {
      drawing.current = null;
      currentMap.off("click", onClick);
      currentMap.off("mousemove", onMove);
    };
  }, [isDrawing, map, onSelectFeatures, setDrawing, setInAreaFeatures, targetLayers]);

  return (
    <Source type="geojson" id="selection" data={EmptyFeatureCollection}>
      <Layer
        id="selection"
        type="fill"
        source="selection"
        paint={{
          "fill-outline-color": "#000",
          "fill-color": "#b4b5b5",
          "fill-opacity": 0.3
        }}
      />
    </Source>
  );
};
