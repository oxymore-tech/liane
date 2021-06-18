import React, { useState } from "react";
import { Switch } from "@/components/base/Switch";

export function FiltersAdmin() {

  const [displayRawTrips, setDisplayRawTrips] = useState(true);

  return (
    <div className="absolute inset-y-0 right-0 z-10">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-10 gap-2 m-10">
        <Switch label="Afficher les données brutes" value={displayRawTrips} onChange={setDisplayRawTrips} />
      </div>
    </div>
  );
}

export default FiltersAdmin;