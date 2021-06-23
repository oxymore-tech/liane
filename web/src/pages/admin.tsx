import dynamic from "next/dynamic";
import React from "react";

const LianeMapAdmin = dynamic(() => import("@/components/LianeMapAdmin"), { ssr: false });

export default function Admin() {
  const center = { lat: 44.33718916852679, lng: 3.483382165431976 };
  return (
    <div>
      <LianeMapAdmin className="w-full h-screen" center={center} />
    </div>
  );
}
