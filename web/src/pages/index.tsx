import dynamic from "next/dynamic";
import React from "react";
import { useEffect, useState } from "react";
import { RallyingPoint } from "../api";
import { displayService } from "../api/display-service";
const Mapi = dynamic(() => import("../components/map"), {ssr: false});

export default function Home() {
  const [start, setStart] = useState<RallyingPoint>();
  const center = {lat: 44.33718916852679, lng: 3.483382165431976};
  //const start = {label: "Blajoux_Parking", position: {lat: 44.33718916852679, lng: 3.483382165431976}}
  const blajoux_pelardon = { lat: 44.3388629, lng: 3.4831178 };
  
  useEffect(() => {
    displayService.SnapPosition(blajoux_pelardon.lat, blajoux_pelardon.lng)
      .then(result => setStart(result[0]));
  }, []);

  return <div>
    <Mapi className="w-full h-screen" center={center} start={start}></Mapi>
  </div>;
}
