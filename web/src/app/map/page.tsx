"use client";
import React, { useState } from "react";
import Map from "@/components/map/Map";
import { RallyingPointsLayer } from "@/components/map/layers/RallyingPointsLayer";
import { useCurrentUser } from "@/components/ContextProvider";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";
import { ToastMessage } from "@/components/base/ToastMessage";

export default function Home() {
  const user = useCurrentUser();

  const [zoom, setZoom] = useState<number | undefined>();
  return (
    <Map onZoom={setZoom}>
      {!!user && <LianeDisplayLayer />}
      <RallyingPointsLayer />
      {!!zoom && zoom < 8 && <ToastMessage message="Zoomez pour afficher les points de ralliement." level="info" />}
    </Map>
  );
}
