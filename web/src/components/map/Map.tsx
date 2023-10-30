"use client";

import { LatLng } from "liane-common";
import ZoomHandler from "@/components/map/ZoomHandler";
import MoveHandler from "@/components/map/MoveHandler";
import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_TLS, getMapStyleUrl } from "@liane/common";
import { NodeAppEnv } from "@/api/env";

interface MapProps {
  // onZoomEnd?: (zoom: number) => void;
  // onMoveEnd?: (center: LatLng) => void;
  // tileServer: string;
  // points?: JSX.Element[];
  // routes?: JSX.Element[];
}

function Map({}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map>();

  // Initialize map
  useEffect(() => {
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: getMapStyleUrl(NodeAppEnv),
      center: [DEFAULT_TLS.lng, DEFAULT_TLS.lat],
      zoom: 12
    });
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
  }, []);

  return (
    <div className="h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}

export default Map;
