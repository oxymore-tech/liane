import React from "react";
import "leaflet/dist/leaflet.css";

export function FiltersAdmin() {
  return (
    <div className="absolute inset-y-0 right-0 z-10">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-10 gap-2 m-10">
        Ici on mettra les filtres
      </div>
    </div>
  );
}

export default FiltersAdmin;