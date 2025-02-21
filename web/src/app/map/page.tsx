"use client";
import React, { useCallback, useState } from "react";
import { RallyingPointLayer } from "@/components/map/layers/RallyingPointLayer";
import { useCurrentUser } from "@/components/ContextProvider";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";
import { ToastMessage } from "@/components/base/ToastMessage";
import { ViewStateChangeEvent } from "react-map-gl/mapbox-legacy";
import { AppMapView } from "@/components/map/AppMapView";

export default function Home() {
  const user = useCurrentUser();

  const [zoom, setZoom] = useState<number | undefined>();

  const handleZoomChanged = useCallback((e: ViewStateChangeEvent) => {
    setZoom(e.viewState.zoom);
  }, []);

  return (
    <AppMapView onZoom={handleZoomChanged}>
      {!!user && <LianeDisplayLayer />}
      <RallyingPointLayer />
      {!!zoom && zoom < 8 && <ToastMessage message="Zoomez pour afficher les points de ralliement." level="info" />}
    </AppMapView>
  );
}
