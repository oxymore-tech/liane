import React, { useState } from "react";
import { Switch } from "@/components/base/Switch";
import { Select } from "@/components/base/Select";
import { TextInput } from "@/components/base/TextInput";
import { Button } from "@/components/base/Button";
import { FilterOptions } from "@/components/LianeMapAdmin";
import { IndexedRawTrip } from "@/api";

interface FilterProps {
  callback: (filterOptions: FilterOptions) => void,
  rawTrips: IndexedRawTrip[]
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

export function AdminFilter({ callback, rawTrips }: FilterProps) {
  const [displayRawTrips, setDisplayRawTrips] = useState(true);
  const [displayRallyingPoints, setDisplayRallyingPoints] = useState(false);
  const [allUsers, setAllUsers] = useState(true);
  const [chosenUser, setChosenUser] = useState<string>();
  const [allTrips, setAllTrips] = useState(true);
  const [chosenTrip, setChosenTrip] = useState<number>();
  const [displayBackground, setDisplayBackground] = useState(true);
  const [displayForeground, setDisplayForeground] = useState(true);
  const [distanceBetweenPoints, setDistanceBetweenPoints] = useState<number>();
  const [timeBetweenPoints, setTimeBetweenPoints] = useState<number>();

  function cb() {
    callback({
      displayRawTrips,
      displayRallyingPoints,
      allUsers,
      chosenUser,
      displayBackground,
      displayForeground,
      distanceBetweenPoints,
      timeBetweenPoints,
      allTrips,
      chosenTrip
    });
  }

  function selectTripController(id) {
    if ((typeof id === "string") || (id === 0)) {
      setAllTrips(true);
    } else {
      setAllTrips(false);
    }
    setChosenTrip(id);
  }

  function selectUserController(user) {
    if (user === "Tous les utilisateurs") {
      setAllUsers(true);
    } else {
      setAllUsers(false);
    }
    setChosenUser(user);
  }

  return (
    <div className="absolute top-0 right-0 z-10 overflow-auto">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-6 gap-2 m-6">
        <Switch label="Données brutes" value={displayRawTrips} onChange={setDisplayRawTrips} color="yellow" />
        <Switch label="Points de raliement" value={displayRallyingPoints} onChange={setDisplayRallyingPoints} color="yellow" />

        <Select
          className="col-span-2"
          label="Choisir l'utilisateur"
          options={Array.from(extractUsers(rawTrips))}
          value={chosenUser}
          render={(id) => id}
          onChange={(id) => selectUserController(id)}
          placeholder="Aucun"
        />

        <Select
          className="col-span-2"
          label="Choisir le trajet"
          options={Array.from(extractIndex(rawTrips))}
          value={chosenTrip}
          render={(id) => (!(id === 0) ? id : null)}
          onChange={(id) => {
            selectTripController(id);
          }}
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

        <Button
          color="orange"
          className="mt-4 col-span-2"
          label="Valider"
          onClick={() => { cb(); }}
        />
      </div>
    </div>
  );
}
