import React from "react";
import { Button } from "@/components/base/Button";
import { TripService } from "@/api/trip-service";
import { RallyingPointService } from "@/api/rallying-point-service";

interface LianeStatisticsProps {
  numberOfLianes: number,
  numberOfRaws: number,
  numberOfUsers: number
}

export function LianeStatistics({ numberOfLianes, numberOfRaws, numberOfUsers }: LianeStatisticsProps) {
  return (
    <div className="absolute left-12 z-10 ">
      <div className="bg-white w-96 shadow-xl bg-opacity-80 rounded-lg grid grid-cols-2 p-2 gap-2 ">
        <Button
          color="blue"
          className="mb-2 col-span-2"
          label="Re-générer les lianes"
          onClick={async () => { await TripService.generateLianes(); }}
        />
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