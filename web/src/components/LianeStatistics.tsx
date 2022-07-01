import React from "react";

interface LianeStatisticsProps {
  numberOfLianes: number,
  numberOfRaws: number,
  numberOfUsers: number
}

export function LianeStatistics({ numberOfLianes, numberOfRaws, numberOfUsers }: LianeStatisticsProps) {
  return (
    <div className="absolute top-0 left-0 z-10 overflow-auto">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-6 gap-2 m-6">
        <div className="col-span-2">
          <span className="font-bold">Statistiques générales</span>
          <ul>
            <li>
              {numberOfUsers}
              {" "}
              utilisateurs
            </li>
          </ul>
        </div>
        <div className="col-span-2">
          <span className="font-bold">Statistiques des trajets bruts</span>
          <ul>
            <li>
              {numberOfRaws}
              {" "}
              trajets bruts enregistrés
            </li>
          </ul>
        </div>
        <div className="col-span-2">
          <span className="font-bold">Statistiques des lianes</span>
          <ul>
            <li>
              {numberOfLianes}
              {" "}
              lianes enregistrées
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
