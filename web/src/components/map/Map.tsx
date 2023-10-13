"use client";

import { LatLng } from "liane-common";
import ZoomHandler from "@/components/map/ZoomHandler";
import MoveHandler from "@/components/map/MoveHandler";
import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
  const [lng] = useState(1.2680346);
  const [lat] = useState(43.6005849);
  const [zoom] = useState(14);
  const [API_KEY] = useState("SoaAIledY5uSXWqbY5HH");

  useEffect(() => {
    if (map.current) return; // stops map from intializing more than once

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${API_KEY}`,
      center: [lng, lat],
      zoom: zoom
    });
  }, [API_KEY, lng, lat, zoom]);

  return (
    <div className="h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}

export default Map;
