"use client";
import React, { useState } from "react";
import Map from "@/components/map/Map";
import { RallyingPointsLayer } from "@/components/map/layers/RallyingPointsLayer";
import { useCurrentUser } from "@/components/ContextProvider";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";
import { ToastMessage } from "@/components/base/ToastMessage";
import { Datepicker } from "flowbite-react";

export default function Home() {
  const user = useCurrentUser();
  const [date, setDate] = useState(new Date());
  const [zoom, setZoom] = useState<number | undefined>();
  return (
    <Map onZoom={setZoom}>
      {!!user && <LianeDisplayLayer date={date} />}
      <RallyingPointsLayer />
      {!!zoom && zoom < 8 && <ToastMessage message="Zoomez pour afficher les points de ralliement." level="info" />}
      {!!user && (
        <div className="absolute top-2 left-2 z-20 flex gap-2">{!!user && <Datepicker defaultDate={date} onSelectedDateChanged={setDate} />}</div>
      )}
    </Map>
  );
}
