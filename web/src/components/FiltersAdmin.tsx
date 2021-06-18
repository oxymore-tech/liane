import React, { ReactNode, useState } from "react";
import { Switch } from "@/components/base/Switch";
import { Select } from "@/components/base/Select";
import { TextInput } from "@/components/base/TextInput";

export function FiltersAdmin() {

  const [displayRawTrips, setDisplayRawTrips] = useState(false);
  const [displayRallyingPoints, setDisplayRallyingPoints] = useState(false);
  const [chooseUser, setChooseUser] = useState(false);
  const idUser = ["0603891703", "0603891704"];

  return (
    <div className="absolute inset-y-0 right-0 z-10">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-10 gap-2 m-10">

        <Switch label="Données brutes ?" value={displayRawTrips} onChange={setDisplayRawTrips} color="yellow" />
        <Switch label="Rallying points ?" value={displayRallyingPoints} onChange={setDisplayRallyingPoints} color="yellow" />
        <Switch label="Tous les utilisateurs ?" value={chooseUser} onChange={setChooseUser} color="yellow" />
        {}
        <Select
          className="col-span-2"
          label="Choisir votre utilisateur"
          options={idUser}
          render={(o) => o}
          placeholder="Numéro de téléphone "
        />
        <TextInput
          className="col-span-2"
          type="number"
          label="Intervalle de temps minimum entre deux points"
          placeholder="Aucun"
        />
        <TextInput
          className="col-span-2"
          type="number"
          label="Distance minimum entre deux points"
          placeholder="Aucune"
        />
      </div>
    </div>
  );
}

export default FiltersAdmin;