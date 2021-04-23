import dynamic from "next/dynamic";
import React from "react";

const Mapi = dynamic(() => import("@/components/LianeMap"), { ssr: false });

export default function Home() {
  const center = { lat: 44.33718916852679, lng: 3.483382165431976 };
  return (
    <div>
      <Mapi className="w-full h-screen" center={center} />
    </div>
  );
}
