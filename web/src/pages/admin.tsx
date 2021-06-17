import dynamic from "next/dynamic";
import React from "react";
import { FiltersAdmin } from "@/components/FiltersAdmin";

const Mapi = dynamic(() => import("@/components/LianeMapAdmin"), { ssr: false });

function Admin() {
  const center = { lat: 44.33718916852679, lng: 3.483382165431976 };
  return (
    <div>
      <div>
        <Mapi className="w-full h-screen" center={center} />
      </div>
      <FiltersAdmin />
    </div>
  );
}

export default Admin;