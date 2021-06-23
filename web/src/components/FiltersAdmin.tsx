import React, { useState } from "react";
import { Switch } from "@/components/base/Switch";
import { Select } from "@/components/base/Select";
import { TextInput } from "@/components/base/TextInput";
import { FilterOptions } from "@/api";
import { Button } from "@/components/base/Button";

const Test = require("@/api/tests.json");

interface FilterProps {
  callback: (filterOptions: FilterOptions) => void
}

export function FiltersAdmin({ callback }: FilterProps) {

  const [displayRawTrips, setDisplayRawTrips] = useState(true);
  const [displayRallyingPoints, setDisplayRallyingPoints] = useState(false);
  const [allUsers, setAllUsers] = useState(true);
  const [displayBackground, setDisplayBackground] = useState(true);
  const [displayForeground, setDisplayForeground] = useState(true);
  const [chosenUser, setChosenUser] = useState<string>();
  const [distanceBetweenPoints, setDistanceBetweenPoints] = useState<number>();
  const [timeBetweenPoints, setTimeBetweenPoints] = useState<number>();
  const idUsers = Test.map((rawTrips) => rawTrips.user);

  function cb() {
    callback({
      displayRawTrips, displayRallyingPoints, allUsers, chosenUser, displayBackground, displayForeground, distanceBetweenPoints, timeBetweenPoints
    });
  }

  return (
    <div className="absolute inset-y-0 right-0 z-10 overflow-scroll">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-6 gap-2 m-6">

        <Switch label="Données brutes ?" value={displayRawTrips} onChange={(v) => { setDisplayRawTrips(v); }} color="yellow" />
        <Switch label="Rallying points ?" value={displayRallyingPoints} onChange={(v) => { setDisplayRallyingPoints(v); }} color="yellow" />
        <Switch label="Tous les utilisateurs ?" value={allUsers} onChange={(v) => { setAllUsers(v); }} color="yellow" />

        {!allUsers
          ? (
            <Select
              className="col-span-2"
              label="Choisir votre utilisateur"
              options={idUsers}
              value={chosenUser}
              render={(id) => id}
              onChange={(id) => setChosenUser(id)}

            />
          )
          : null }

        <TextInput
          className="col-span-2"
          type="number"
          label="Intervalle de temps minimum entre deux points"
          onChange={(t:number) => { setTimeBetweenPoints(t); }}
          placeholder="Aucun"
        />
        <TextInput
          className="col-span-2"
          type="number"
          label="Distance minimum entre deux points"
          onChange={(d:number) => { setDistanceBetweenPoints(d); }}
          placeholder="Aucune"
        />
        <Switch label="Données background" value={displayBackground} onChange={(v) => { setDisplayBackground(v); }} color="yellow" />
        <Switch label="Données foreground" value={displayForeground} onChange={(v) => { setDisplayForeground(v); }} color="yellow" />
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

export default FiltersAdmin;