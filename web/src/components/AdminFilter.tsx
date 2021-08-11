import React, { useEffect, useState } from "react";
import { Switch } from "@/components/base/Switch";
import { Select } from "@/components/base/Select";
import { TextInput } from "@/components/base/TextInput";
import { Button } from "@/components/base/Button";
import { IndexedRawTrip } from "@/api";

interface FilterProps {
  callback: (filterOptions: FilterOptions) => void,
  load: () => void,
  rawTrips: IndexedRawTrip[]
}

export interface FilterOptions {
  chosenUser?: string;
  chosenTrip?: number;
  displayBackground: boolean;
  displayForeground: boolean;
  distanceBetweenPoints?: number;
  timeBetweenPoints?: number;
}

function extractIndex(rawTrips: IndexedRawTrip[]) {
  let indexes = new Set<number|string>();
  indexes = indexes.add("Tous les trajets");
  rawTrips.forEach((r: IndexedRawTrip) => {
    indexes = indexes.add(r.index);
  });
  return indexes;
}

function extractUsers(rawTrips: IndexedRawTrip[]) {
  let users = new Set<string>();
  users = users.add("Tous les utilisateurs");
  rawTrips.forEach((r: IndexedRawTrip) => {
    users = users.add(r.user);
  });

  return users;
}

export function AdminFilter({ callback, load, rawTrips }: FilterProps) {
  const [chosenUser, setSelectedUser] = useState<string>();
  const [chosenTrip, setSelectedTrip] = useState<number>();
  const [displayBackground, setDisplayBackground] = useState(true);
  const [displayForeground, setDisplayForeground] = useState(true);
  const [distanceBetweenPoints, setDistanceBetweenPoints] = useState<number>();
  const [timeBetweenPoints, setTimeBetweenPoints] = useState<number>();

  // Update dynamically

  useEffect(() => {
    callback({
      chosenUser,
      displayBackground,
      displayForeground,
      distanceBetweenPoints,
      timeBetweenPoints,
      chosenTrip
    });
  }, [chosenUser, displayBackground, displayForeground, distanceBetweenPoints, timeBetweenPoints, chosenTrip]);

  return (
    <div className="absolute top-0 right-0 z-10 overflow-auto">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-6 gap-2 m-6">
        <span>Charger les trajets</span>

        <Button
          color="orange"
          className="mt-4 col-span-2"
          label="Charger"
          onClick={load}
        />

        <span>Filtrer les trajets</span>

        <Select
          className="col-span-2"
          label="Choisir l'utilisateur"
          options={Array.from(extractUsers(rawTrips))}
          value={chosenUser}
          render={(id) => id}
          onChange={setSelectedUser}
          placeholder="Aucun"
        />

        <Select
          className="col-span-2"
          label="Choisir le trajet"
          options={Array.from(extractIndex(rawTrips))}
          value={chosenTrip}
          render={(id) => (!(id === 0) ? id : null)}
          onChange={setSelectedTrip}
        />

        <TextInput
          className="col-span-2"
          type="number"
          label="Interval de temps minimal (en min)"
          onChange={(t: number) => { setTimeBetweenPoints(t); }}
          placeholder="Aucun"
        />

        <TextInput
          className="col-span-2"
          type="number"
          label="Distance minimale (en m)"
          onChange={(d: number) => { setDistanceBetweenPoints(d); }}
          placeholder="Aucune"
        />

        <Switch label="Données background" value={displayBackground} onChange={setDisplayBackground} color="yellow" />
        <Switch label="Données foreground" value={displayForeground} onChange={setDisplayForeground} color="yellow" />
      </div>
    </div>
  );
}
