"use client";
import React, { useMemo } from "react";
import Map from "@/components/map/Map";
import { RallyingPointsLayer } from "@/components/map/layers/RallyingPointsLayer";
import { useCurrentUser } from "@/components/ContextProvider";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";

export default function Home() {
  const user = useCurrentUser();
  const date = useMemo(() => new Date(), []);
  return (
    <Map>
      {!!user && <LianeDisplayLayer date={date} />}
      <RallyingPointsLayer />
    </Map>
  );
}
