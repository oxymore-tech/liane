import dynamic from "next/dynamic";
import React from "react";
import { LatLng } from "@/api";

const DEFAULT_CENTER = { lat: 44.33718916852679, lng: 3.483382165431976 } as LatLng;
const Mapi = dynamic(() => import("@/components/MapManager"), { ssr: false });

export default function Home() {
  return (
    <Mapi className="w-full h-screen" defaultCenter={DEFAULT_CENTER}/>
  );
}
