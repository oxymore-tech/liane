import React, { useState } from "react";
import { Switch } from "@/components/base/Switch";
import { Select } from "@/components/base/Select";
import { TextInput } from "@/components/base/TextInput";

interface FilterProps {
  callback: (o: any) => void
}

export function FiltersAdmin({ callback }: FilterProps) {

  const [displayRawTrips, setDisplayRawTrips] = useState(true);
  const [displayRallyingPoints, setDisplayRallyingPoints] = useState(false);
  const [chooseUser, setChooseUser] = useState(false);
  const [chooseBackground, setChooseBackground] = useState(true);
  const [chooseForeground, setChooseForeground] = useState(true);
  const idUser = ["0603891703", "0603891704"];

  function cb() {
    callback({
      displayRawTrips, displayRallyingPoints, chooseUser, chooseBackground, chooseForeground
    });
  }

  return (
    <div className="absolute inset-y-0 right-0 z-10">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-8 gap-2 m-8">

        <Switch label="Données brutes ?" value={displayRawTrips} onChange={(v) => { setDisplayRawTrips(v); cb(); }} color="yellow" />
        <Switch label="Rallying points ?" value={displayRallyingPoints} onChange={setDisplayRallyingPoints} color="yellow" />
        <Switch label="Tous les utilisateurs ?" value={chooseUser} onChange={setChooseUser} color="yellow" />

        {!chooseUser
          ? (
            <Select
              className="col-span-2"
              label="Choisir votre utilisateur"
              options={idUser}
              render={(o) => o}
              value="user"
              placeholder="Numéro de téléphone "
            />
          )
          : null }

        <TextInput
          className="col-span-2"
          type="number"
          label="Intervalle de temps minimum entre deux points"
          value="timeInterval"
          placeholder="Aucun"
        />
        <TextInput
          className="col-span-2"
          type="number"
          label="Distance minimum entre deux points"
          value="distanceInterval"
          placeholder="Aucune"
        />
        <Switch label="Données background" value={chooseBackground} onChange={setChooseBackground} color="yellow" />
        <Switch label="Données foreground" value={chooseForeground} onChange={setChooseForeground} color="yellow" />
      </div>
    </div>
  );
}

export default FiltersAdmin;